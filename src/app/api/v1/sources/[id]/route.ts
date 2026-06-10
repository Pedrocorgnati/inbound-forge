// TASK-013: detalhe operacional de fontes com logs e flags de compliance.

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import {
  requireSession,
  ok,
  notFound,
  validationError,
  conflict,
  internalError,
} from '@/lib/api-auth'
import { updateSource, deleteSource } from '@/lib/services/source.service'

type Params = { params: Promise<{ id: string }> }

// Reconciliacao TASK-016: o frontend (SourceList toggle/delete, SourceForm edit) chama
// PATCH e DELETE em /api/v1/sources/[id], mas o v1 so expunha GET (405 ao vivo). Os
// handlers abaixo portam o contrato da rota legada /api/sources/[id] reusando os mesmos
// services (updateSource/deleteSource), preservando INT-093 (protegida nao deleta),
// INT-136 (dominio bloqueado) e DUPLICATE_URL. Comportamento identico ao legacy => shimavel.
const UpdateSourceSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  url: z.string().url().max(1024).optional(),
  selector: z.string().max(512).nullable().optional(),
  crawlFrequency: z.enum(['hourly', 'daily', 'weekly']).optional(),
  isActive: z.boolean().optional(),
})

function serializeDate(value: Date | null) {
  return value?.toISOString() ?? null
}

function inferSourceType(url: string, selector: string | null): 'RSS' | 'SCRAPING' | 'MANUAL' {
  const normalized = url.toLowerCase()
  if (normalized.includes('/feed') || normalized.includes('rss') || normalized.endsWith('.xml')) {
    return 'RSS'
  }
  if (selector) return 'SCRAPING'
  return 'MANUAL'
}

export async function GET(_request: NextRequest, { params }: Params) {
  const { user, response } = await requireSession()
  if (response) return response

  const { id } = await params

  try {
    const source = await prisma.source.findFirst({
      where: { id, operatorId: user!.id },
      select: {
        id: true,
        operatorId: true,
        name: true,
        url: true,
        isActive: true,
        isProtected: true,
        selector: true,
        crawlFrequency: true,
        rateLimitPerMinute: true,
        lastCrawledAt: true,
        antiBotBlocked: true,
        antiBotReason: true,
        antiBotBlockedAt: true,
        consecutiveFailures: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!source) return notFound('Fonte nao encontrada.')

    const [
      recentLogs,
      totalRuns,
      successfulRuns,
      failedRuns,
      partialRuns,
      scrapedTextsCount,
      robotsDeniedRuns,
    ] = await Promise.all([
        prisma.scrapingAuditLog.findMany({
          where: { sourceId: id },
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            sourceId: true,
            sourceUrl: true,
            textsCollected: true,
            textsClassified: true,
            errorsCount: true,
            durationMs: true,
            status: true,
            errorMessage: true,
            createdAt: true,
          },
        }),
        prisma.scrapingAuditLog.count({ where: { sourceId: id } }),
        prisma.scrapingAuditLog.count({ where: { sourceId: id, status: 'SUCCESS' } }),
        prisma.scrapingAuditLog.count({ where: { sourceId: id, status: 'FAILED' } }),
        prisma.scrapingAuditLog.count({ where: { sourceId: id, status: 'PARTIAL' } }),
        prisma.scrapedText.count({ where: { sourceId: id, operatorId: user!.id } }),
        // fix REPROVADO (finding TASK-013): evidencia REAL de respeito ao robots.txt,
        // derivada das decisoes registradas nos audit logs do scraper.
        prisma.scrapingAuditLog.count({ where: { sourceId: id, robotsDecision: 'DENY' } }),
      ])

    const successRate = totalRuns > 0 ? Math.round((successfulRuns / totalRuns) * 100) : null
    const type = inferSourceType(source.url, source.selector)

    return ok({
      source: {
        ...source,
        type,
        lastCrawledAt: serializeDate(source.lastCrawledAt),
        antiBotBlockedAt: serializeDate(source.antiBotBlockedAt),
        createdAt: source.createdAt.toISOString(),
        updatedAt: source.updatedAt.toISOString(),
      },
      metrics: {
        totalRuns,
        successfulRuns,
        failedRuns,
        partialRuns,
        successRate,
        scrapedTextsCount,
      },
      // fix REPROVADO (finding TASK-013): flags de compliance lastreadas em dados
      // REAIS, nao mais hardcoded. Onde nao ha evidencia (0 runs), o valor reflete
      // honestamente a ausencia de violacao observada (Zero Assumido).
      compliance: {
        // respeitado quando NENHUM run recente registrou robotsDecision=DENY
        robotsTxtRespected: robotsDeniedRuns === 0,
        // worker usa BROWSERLESS_WS_URL; mantem fallback aos nomes legados
        browserlessConfigured: Boolean(
          process.env.BROWSERLESS_WS_URL ||
            process.env.BROWSERLESS_URL ||
            process.env.BROWSERLESS_API_KEY,
        ),
        rateLimited: source.rateLimitPerMinute > 0,
        // trilha de auditoria LGPD existe de fato quando ha audit logs para a fonte
        lgpdAuditEnabled: totalRuns > 0,
        antiBotProtectionOk: !source.antiBotBlocked,
      },
      logs: recentLogs.map((log) => ({
        ...log,
        createdAt: log.createdAt.toISOString(),
      })),
    })
  } catch (err) {
    console.error('[Sources] GET /api/v1/sources/:id error', err instanceof Error ? err.message : 'unknown')
    return internalError('Falha ao carregar detalhe da fonte.')
  }
}

// PATCH /api/v1/sources/[id] — atualizacao parcial (porte do contrato legacy).
export async function PATCH(request: NextRequest, { params }: Params) {
  const { user, response: authError } = await requireSession()
  if (authError) return authError

  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return validationError(new Error('Body JSON inválido'))
  }

  const parsed = UpdateSourceSchema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error)

  try {
    const result = await updateSource(id, user!.id, parsed.data)

    if (!result.ok) {
      if (result.code === 'NOT_FOUND') return notFound()
      if (result.code === 'BLOCKED_DOMAIN') return conflict('Domínio não permitido para scraping (INT-136).')
      if (result.code === 'DUPLICATE_URL') return conflict('Esta URL já está cadastrada como fonte.')
      return NextResponse.json(
        { success: false, code: 'SRC_001', error: 'Fonte protegida não pode ser modificada.' },
        { status: 403 }
      )
    }

    return ok(result.source)
  } catch (err) {
    console.error('[Sources] PATCH /api/v1/sources/:id error', err instanceof Error ? err.message : 'unknown')
    return internalError()
  }
}

// DELETE /api/v1/sources/[id] — remocao com guarda INT-093 (porte do contrato legacy).
export async function DELETE(_request: NextRequest, { params }: Params) {
  const { user, response: authError } = await requireSession()
  if (authError) return authError

  const { id } = await params

  try {
    const result = await deleteSource(id, user!.id)

    if (!result.ok) {
      if (result.code === 'NOT_FOUND') return notFound()
      if (result.code === 'PROTECTED') {
        return NextResponse.json(
          { success: false, code: 'SRC_001', error: 'Fonte protegida não pode ser removida (INT-093).' },
          { status: 403 }
        )
      }
    }

    return new NextResponse(null, { status: 204 })
  } catch (err) {
    console.error('[Sources] DELETE /api/v1/sources/:id error', err instanceof Error ? err.message : 'unknown')
    return internalError()
  }
}
