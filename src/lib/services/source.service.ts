/**
 * Source Service — Inbound Forge
 * TASK-4 ST001-ST003 / module-6-scraping-worker
 *
 * Gerenciamento de fontes de scraping com validação de domínios bloqueados.
 * INT-136: nunca permitir LinkedIn, Facebook ou equivalentes.
 * INT-093: fontes isProtected=true não podem ser deletadas.
 */
import { randomUUID } from 'crypto'
import { prisma } from '@/lib/prisma'
import { isBlockedDomain } from '@/lib/constants/blocked-domains'
import { isBlockedLiteralHost } from '@/lib/security/safe-fetch'
import { AUDIT_ACTIONS } from '@/lib/audit'

// SA-SEC-02 (defense-in-depth): rejeita IP literal interno/localhost ja na
// criacao/edicao. A validacao autoritativa com DNS-resolve roda no acesso
// (safeFetch no /test, assertUrlSafe no worker), pois o host pode resolver
// publico aqui e sofrer rebinding depois.
function hasBlockedLiteralHost(rawUrl: string): boolean {
  try {
    return isBlockedLiteralHost(new URL(rawUrl).hostname)
  } catch {
    return true // URL malformada -> tratar como bloqueada
  }
}

export interface SourceDto {
  id: string
  operatorId: string
  name: string
  url: string
  isActive: boolean
  isProtected: boolean
  selector: string | null
  crawlFrequency: string
  rateLimitPerMinute: number
  lastCrawledAt: string | null
  // TASK-3 CL-030
  antiBotBlocked: boolean
  antiBotReason: string | null
  antiBotBlockedAt: string | null
  consecutiveFailures: number
  createdAt: string
  updatedAt: string
}

export interface CreateSourceInput {
  name: string
  url: string
  selector?: string
  crawlFrequency?: string
}

export interface UpdateSourceInput {
  name?: string
  url?: string
  selector?: string | null
  crawlFrequency?: string
  isActive?: boolean
}

function toDto(source: {
  id: string
  operatorId: string
  name: string
  url: string
  isActive: boolean
  isProtected: boolean
  selector: string | null
  crawlFrequency: string
  rateLimitPerMinute: number
  lastCrawledAt: Date | null
  antiBotBlocked: boolean
  antiBotReason: string | null
  antiBotBlockedAt: Date | null
  consecutiveFailures: number
  createdAt: Date
  updatedAt: Date
}): SourceDto {
  return {
    ...source,
    lastCrawledAt: source.lastCrawledAt?.toISOString() ?? null,
    antiBotBlockedAt: source.antiBotBlockedAt?.toISOString() ?? null,
    createdAt: source.createdAt.toISOString(),
    updatedAt: source.updatedAt.toISOString(),
  }
}

export async function listSources(
  operatorId: string,
  filters?: { isActive?: boolean }
): Promise<SourceDto[]> {
  const sources = await prisma.source.findMany({
    where: {
      operatorId,
      ...(filters?.isActive !== undefined ? { isActive: filters.isActive } : {}),
    },
    orderBy: { createdAt: 'asc' },
  })

  return sources.map(toDto)
}

export async function findSourceById(
  id: string,
  operatorId: string
): Promise<SourceDto | null> {
  const source = await prisma.source.findFirst({
    where: { id, operatorId },
  })

  return source ? toDto(source) : null
}

export type CreateSourceResult =
  | { ok: true; source: SourceDto }
  | { ok: false; code: 'BLOCKED_DOMAIN' | 'DUPLICATE_URL' }

export async function createSource(
  operatorId: string,
  input: CreateSourceInput
): Promise<CreateSourceResult> {
  // INT-136: bloquear domínios proibidos
  if (isBlockedDomain(input.url)) {
    return { ok: false, code: 'BLOCKED_DOMAIN' }
  }

  // SA-SEC-02: bloquear IP literal interno/localhost na criacao (defense-in-depth)
  if (hasBlockedLiteralHost(input.url)) {
    return { ok: false, code: 'BLOCKED_DOMAIN' }
  }

  // Verificar duplicata por operador + URL
  const existing = await prisma.source.findFirst({
    where: { operatorId, url: input.url },
  })

  if (existing) {
    return { ok: false, code: 'DUPLICATE_URL' }
  }

  const source = await prisma.source.create({
    data: {
      operatorId,
      name: input.name,
      url: input.url,
      selector: input.selector ?? null,
      crawlFrequency: input.crawlFrequency ?? 'daily',
    },
  })

  return { ok: true, source: toDto(source) }
}

export type UpdateSourceResult =
  | { ok: true; source: SourceDto }
  | { ok: false; code: 'NOT_FOUND' | 'BLOCKED_DOMAIN' | 'DUPLICATE_URL' | 'PROTECTED' }

export async function updateSource(
  id: string,
  operatorId: string,
  input: UpdateSourceInput
): Promise<UpdateSourceResult> {
  const existing = await prisma.source.findFirst({ where: { id, operatorId } })
  if (!existing) return { ok: false, code: 'NOT_FOUND' }

  // INT-136: validar novo URL se fornecido
  if (input.url && isBlockedDomain(input.url)) {
    return { ok: false, code: 'BLOCKED_DOMAIN' }
  }

  // SA-SEC-02: bloquear IP literal interno/localhost na edicao (defense-in-depth)
  if (input.url && hasBlockedLiteralHost(input.url)) {
    return { ok: false, code: 'BLOCKED_DOMAIN' }
  }

  // Verificar duplicata se URL mudou
  if (input.url && input.url !== existing.url) {
    const dup = await prisma.source.findFirst({
      where: { operatorId, url: input.url },
    })
    if (dup) return { ok: false, code: 'DUPLICATE_URL' }
  }

  const updated = await prisma.source.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.url !== undefined ? { url: input.url } : {}),
      ...(input.selector !== undefined ? { selector: input.selector } : {}),
      ...(input.crawlFrequency !== undefined ? { crawlFrequency: input.crawlFrequency } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    },
  })

  if (input.isActive !== undefined && input.isActive !== existing.isActive) {
    // fix REPROVADO (finding TASK-013): correlation_id GARANTIDO e falha de audit
    // NUNCA mais silenciada. A pausa/reativacao continua nao-bloqueante (decisao
    // pos-mutacao fire-and-forget), mas qualquer falha do audit e registrada em log
    // com o correlationId (Zero Silencio) em vez de um catch vazio.
    const correlationId = randomUUID()
    try {
      const { auditLog } = await import('@/lib/audit')
      await auditLog({
        action: input.isActive ? AUDIT_ACTIONS.SOURCE_ACTIVATED : AUDIT_ACTIONS.SOURCE_PAUSED,
        entityType: 'Source',
        entityId: id,
        userId: operatorId,
        metadata: {
          correlationId,
          sourceId: id,
          previousActive: existing.isActive,
          nextActive: input.isActive,
          url: existing.url,
        },
      })
    } catch (auditError) {
      console.error(
        `[source.service] audit log falhou (correlationId=${correlationId}, sourceId=${id}, action=${
          input.isActive ? 'SOURCE_ACTIVATED' : 'SOURCE_PAUSED'
        }):`,
        auditError instanceof Error ? auditError.message : 'unknown',
      )
    }
  }

  return { ok: true, source: toDto(updated) }
}

export type DeleteSourceResult =
  | { ok: true }
  | { ok: false; code: 'NOT_FOUND' | 'PROTECTED' }

export async function deleteSource(
  id: string,
  operatorId: string
): Promise<DeleteSourceResult> {
  const source = await prisma.source.findFirst({ where: { id, operatorId } })
  if (!source) return { ok: false, code: 'NOT_FOUND' }

  // INT-093: fontes protegidas (seeds curadas) não podem ser deletadas
  if (source.isProtected) {
    return { ok: false, code: 'PROTECTED' }
  }

  // CL-252: delete em transacao + audit log
  await prisma.$transaction(async (tx) => {
    await tx.source.delete({ where: { id } })
  })

  try {
    const { auditLog } = await import('@/lib/audit')
    await auditLog({
      action: 'SOURCE_DELETED',
      entityType: 'Source',
      entityId: id,
      userId: operatorId,
      metadata: { url: source.url, name: source.name },
    })
  } catch {
    // Audit failure nunca bloqueia a operacao
  }

  return { ok: true }
}
