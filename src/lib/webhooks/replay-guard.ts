/**
 * Webhook replay guard — TAREFA-021 (P2) hardening do webhook Cal.com.
 *
 * Duas defesas independentes, ambas puras-na-borda + persistencia race-safe:
 *
 *  1. Dedup por `eventId` dentro de uma janela de 7 dias. O `eventId` e o
 *     SHA-256 hex do raw body — entregas redundantes do mesmo evento (retries
 *     do Cal.com) produzem corpo identico e portanto o mesmo `eventId`. A
 *     unicidade e garantida no banco (`WebhookEventLog.eventId @unique`), entao
 *     a deteccao de duplicata e atomica: tentamos `create`, e a violacao de
 *     unique (P2002) sinaliza duplicata sem race entre `find` e `create`.
 *
 *  2. Anti-replay por timestamp: o `payloadTimestamp` (emissao do evento pelo
 *     Cal.com) nao pode estar mais antigo que 5 minutos. Quando o Cal.com omite
 *     o timestamp (campo opcional no payload) nao ha como aferir frescor —
 *     fail-open com WARN no caller (Zero Silencio), preservando o comportamento
 *     atual do webhook que ja opera sem `createdAt`. A decisao de fail-open e
 *     deliberada e documentada (Zero Assumido): rejeitar entregas sem timestamp
 *     quebraria todo evento legitimo que nao traga `createdAt`.
 *
 * `correlationId` (UUID v4) e emitido por evento aceito e propagado a logs e a
 * resposta para rastreabilidade ponta-a-ponta.
 */
import { createHash, randomUUID } from 'node:crypto'
import { prisma } from '@/lib/prisma'

export const REPLAY_MAX_AGE_MS = 5 * 60 * 1000 // 5 minutos (anti-replay)
export const DEDUP_WINDOW_MS = 7 * 24 * 60 * 60 * 1000 // 7 dias (janela de dedup)

/**
 * Deriva o identificador canonico do evento a partir do corpo bruto.
 * SHA-256 hex (64 chars) — estavel entre retries, independente do secret.
 */
export function deriveEventId(rawBody: string): string {
  return createHash('sha256').update(rawBody, 'utf8').digest('hex')
}

export type FreshnessResult =
  | { fresh: true; ageMs: number | null; reason: 'within-window' | 'no-timestamp' }
  | { fresh: false; ageMs: number; reason: 'too-old' }

/**
 * Verifica se o timestamp de emissao do evento esta dentro da janela anti-replay.
 *
 * - timestamp ausente ou nao parseavel -> fresh:true reason:'no-timestamp'
 *   (fail-open; o caller deve emitir WARN).
 * - idade > maxAgeMs -> fresh:false reason:'too-old'.
 * - caso contrario -> fresh:true reason:'within-window'.
 */
export function checkTimestampFreshness(
  timestamp: string | undefined | null,
  now: number = Date.now(),
  maxAgeMs: number = REPLAY_MAX_AGE_MS
): FreshnessResult {
  if (!timestamp) return { fresh: true, ageMs: null, reason: 'no-timestamp' }
  const parsedMs = Date.parse(timestamp)
  if (Number.isNaN(parsedMs)) return { fresh: true, ageMs: null, reason: 'no-timestamp' }
  const ageMs = now - parsedMs
  if (ageMs > maxAgeMs) return { fresh: false, ageMs, reason: 'too-old' }
  return { fresh: true, ageMs, reason: 'within-window' }
}

export type DedupResult =
  | { duplicate: false; correlationId: string }
  | { duplicate: true; correlationId: string; firstSeenAt: Date }

interface RecordEventArgs {
  eventId: string
  triggerEvent: string
  externalBookingId: string | null
  payloadTimestamp: Date | null
  source?: string
}

/** Duck-type guard para violacao de unique do Prisma (P2002), sem import de valor. */
function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: unknown }).code === 'P2002'
  )
}

/**
 * Registra o evento e detecta duplicata dentro da janela de 7 dias de forma
 * race-safe via constraint de unicidade no banco.
 *
 * - Primeira ocorrencia -> cria registro, duplicate:false.
 * - Ocorrencia repetida com `receivedAt` dentro da janela -> duplicate:true.
 * - Ocorrencia repetida fora da janela (>7 dias) -> reanima o registro
 *   (atualiza `receivedAt` e `correlationId`) e trata como duplicate:false.
 */
export async function recordEvent(args: RecordEventArgs): Promise<DedupResult> {
  const correlationId = randomUUID()
  try {
    await prisma.webhookEventLog.create({
      data: {
        eventId: args.eventId,
        correlationId,
        source: args.source ?? 'calcom',
        triggerEvent: args.triggerEvent,
        externalBookingId: args.externalBookingId,
        payloadTimestamp: args.payloadTimestamp,
      },
    })
    return { duplicate: false, correlationId }
  } catch (err) {
    if (!isUniqueViolation(err)) throw err

    const existing = await prisma.webhookEventLog.findUnique({
      where: { eventId: args.eventId },
      select: { correlationId: true, receivedAt: true },
    })

    // Se sumiu entre o create e o find (corrida improvavel), trata como novo.
    if (!existing) return { duplicate: false, correlationId }

    const cutoff = new Date(Date.now() - DEDUP_WINDOW_MS)
    if (existing.receivedAt >= cutoff) {
      return {
        duplicate: true,
        correlationId: existing.correlationId,
        firstSeenAt: existing.receivedAt,
      }
    }

    // Fora da janela de 7 dias: reanima o registro e aceita como novo.
    await prisma.webhookEventLog.update({
      where: { eventId: args.eventId },
      data: { receivedAt: new Date(), correlationId },
    })
    return { duplicate: false, correlationId }
  }
}
