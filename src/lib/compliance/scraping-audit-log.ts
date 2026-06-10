/**
 * Scraping Audit Log — Inbound Forge
 * TASK-1 ST004 / intake-review LGPD Compliance
 *
 * Registra cada evento de coleta (scraping) para conformidade LGPD (CL-147).
 * Base legal: Art. 10 LGPD — Interesse Legítimo.
 * SEC-008: nunca logar rawText ou dados de usuários neste log.
 */
import { prisma } from '@/lib/prisma'

type ScrapingAuditStatus = 'SUCCESS' | 'PARTIAL' | 'FAILED'
type ScrapingRobotsDecision = 'ALLOW' | 'DENY'

const DEFAULT_SCRAPING_AUDIT_TTL_DAYS = 180

export function getScrapingAuditTtlExpiresAt(now = new Date()): Date {
  const raw = process.env.SCRAPING_AUDIT_TTL_DAYS
  const days = raw ? Number.parseInt(raw, 10) : DEFAULT_SCRAPING_AUDIT_TTL_DAYS
  const safeDays = Number.isFinite(days) && days > 0 ? days : DEFAULT_SCRAPING_AUDIT_TTL_DAYS
  return new Date(now.getTime() + safeDays * 24 * 60 * 60 * 1000)
}

export interface ScrapingRunParams {
  sourceId: string
  sourceUrl: string
  textsCollected: number
  textsClassified: number
  errorsCount?: number
  durationMs: number
  status: ScrapingAuditStatus
  robotsDecision?: ScrapingRobotsDecision
  statusCode?: number | null
  latencyMs?: number | null
  correlationId?: string
  revealedBy?: string | null
  ttlExpiresAt?: Date
  errorMessage?: string
}

export interface ScrapingAuditLogDto {
  id: string
  sourceId: string
  sourceUrl: string
  textsCollected: number
  textsClassified: number
  errorsCount: number
  durationMs: number
  status: ScrapingAuditStatus
  robotsDecision: ScrapingRobotsDecision
  statusCode: number | null
  latencyMs: number | null
  correlationId: string
  revealedBy: string | null
  ttlExpiresAt: string
  errorMessage: string | null
  createdAt: string
}

/**
 * Registra uma execução de scraping no audit log dedicado.
 * Deve ser chamado pelo scraping-worker após cada batch concluído.
 */
export async function logScrapingRun(params: ScrapingRunParams): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (prisma as any).scrapingAuditLog.create({
    data: {
      sourceId: params.sourceId,
      sourceUrl: params.sourceUrl,
      textsCollected: params.textsCollected,
      textsClassified: params.textsClassified,
      errorsCount: params.errorsCount ?? 0,
      durationMs: params.durationMs,
      status: params.status,
      robotsDecision: params.robotsDecision ?? 'ALLOW',
      statusCode: params.statusCode ?? null,
      latencyMs: params.latencyMs ?? params.durationMs,
      correlationId: params.correlationId,
      revealedBy: params.revealedBy ?? null,
      ttlExpiresAt: params.ttlExpiresAt ?? getScrapingAuditTtlExpiresAt(),
      errorMessage: params.errorMessage ?? null,
    },
  })
}

export interface ListScrapingAuditLogsParams {
  page?: number
  limit?: number
  sourceId?: string
  operatorId?: string
  status?: ScrapingAuditStatus
  robotsDecision?: ScrapingRobotsDecision
}

/**
 * Lista logs de coleta com paginação.
 * Usado pelo endpoint /api/compliance/scraping-audit (atualizado).
 */
export async function listScrapingAuditLogs(
  params: ListScrapingAuditLogsParams
): Promise<{ data: ScrapingAuditLogDto[]; total: number }> {
  const page = Math.max(1, params.page ?? 1)
  const limit = Math.min(100, Math.max(1, params.limit ?? 20))

  const where = {
    ...(params.operatorId && { source: { operatorId: params.operatorId } }),
    ...(params.sourceId && { sourceId: params.sourceId }),
    ...(params.status && { status: params.status }),
    ...(params.robotsDecision && { robotsDecision: params.robotsDecision }),
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = prisma as any
  const [total, items] = await Promise.all([
    db.scrapingAuditLog.count({ where }),
    db.scrapingAuditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ])

  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: items.map((item: any) => ({
      ...item,
      createdAt: item.createdAt.toISOString(),
      ttlExpiresAt: item.ttlExpiresAt.toISOString(),
    })),
    total,
  }
}
