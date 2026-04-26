// ThemeGenerationService — Inbound Forge
// Módulo: module-7-theme-scoring-engine (TASK-1/ST001)
// Cruza pain_library + case_library + solution_patterns para gerar temas compostos.

import { prisma } from '@/lib/prisma'
import { ThemeScoringService } from './theme-scoring.service'
import type { ThemeGenerationResult } from '@/types/scoring'
import { captureException } from '@/lib/sentry'
import { isScrapingDegraded } from './scraping-health.service'
import { KNOWLEDGE_STATUS } from '@/constants/status'
import { isLtrActive, recalculateIfActive } from '@/lib/services/learn-to-rank.service'
import { checkAndRecord } from '@/lib/services/throttle.service'
import { getThemeThrottleSettings } from '@/lib/settings/system-settings'

const SYSTEM_OPERATOR_ID = 'system'

export class ThemeGenerationService {
  private scoringService = new ThemeScoringService()

  /**
   * Gera temas cruzando PainLibraryEntry + CaseLibraryEntry + SolutionPattern.
   * Lógica:
   * - Para cada pain com cases vinculados via CasePain E solution patterns
   * - Gera um tema por combinação (painId + caseId) — deduplicado via upsert
   * - Se forceRegenerate: recalcula scores dos temas existentes também
   */
  async generate(options?: { forceRegenerate?: boolean }): Promise<ThemeGenerationResult> {
    const start = Date.now()
    let created = 0
    let updated = 0
    let skipped = 0

    // TASK-2/ST001 (gap CL-031): se scraping degraded, motor opera so com base interna.
    const degradedMode = await isScrapingDegraded().catch(() => false)
    const mode: 'full' | 'internal-only' = degradedMode ? 'internal-only' : 'full'
    if (degradedMode) {
      console.warn('[ThemeGeneration] Modo degradado ativo — pulando sinais de scraped_texts')
      await prisma.alertLog
        .create({
          data: {
            severity: 'WARN',
            type: 'DEGRADED_MODE',
            message: 'Theme generation executando em modo internal-only (scraping unhealthy) [mode=internal-only]',
          },
        })
        .catch(() => undefined)
    }

    // CL-054: throttle por hora/dia antes de consumir LLM
    const throttle = await getThemeThrottleSettings().catch(() => ({ perHour: 10, perDay: 50 }))
    const hourly = checkAndRecord('theme-generation:hour', throttle.perHour, 3_600)
    if (!hourly.allowed) {
      await prisma.alertLog
        .create({
          data: {
            severity: 'WARN',
            type: 'THROTTLED',
            message: `Theme generation throttled (hora): ${hourly.current}/${hourly.limit} [scope=hour]`,
          },
        })
        .catch(() => undefined)
      return { created: 0, updated: 0, skipped: 0, durationMs: Date.now() - start, throttled: true }
    }
    const daily = checkAndRecord('theme-generation:day', throttle.perDay, 86_400)
    if (!daily.allowed) {
      await prisma.alertLog
        .create({
          data: {
            severity: 'WARN',
            type: 'THROTTLED',
            message: `Theme generation throttled (dia): ${daily.current}/${daily.limit} [scope=day]`,
          },
        })
        .catch(() => undefined)
      return { created: 0, updated: 0, skipped: 0, durationMs: Date.now() - start, throttled: true }
    }

    // Buscar todas as dores com cases vinculados E solution patterns
    const pains = await prisma.painLibraryEntry.findMany({
      where: { status: KNOWLEDGE_STATUS.VALIDATED },
      include: {
        casePains: {
          include: {
            case: {
              select: {
                id: true,
                name: true,
                outcome: true,
                status: true,
              },
            },
          },
        },
        solutionPatterns: {
          select: { id: true, name: true, description: true },
        },
      },
    })

    for (const pain of pains) {
      // Filtrar apenas cases validados com solution pattern existente
      const validCases = pain.casePains
        .map((cp) => cp.case)
        .filter((c) => c.status === KNOWLEDGE_STATUS.VALIDATED)

      if (validCases.length === 0 || pain.solutionPatterns.length === 0) {
        continue
      }

      for (const caseEntry of validCases) {
        const pattern = pain.solutionPatterns[0] // usar o primeiro pattern disponível

        // Derivar título e descrição a partir das entidades
        const title = `${pain.title} — ${pattern.name}`
        const _description = [
          pain.description,
          pattern.description,
          caseEntry.outcome,
        ]
          .filter(Boolean)
          .join('\n\n')
          .slice(0, 2000)

        // Upsert por (painId + caseId) para deduplicação
        const existing = await prisma.theme.findFirst({
          where: { painId: pain.id, caseId: caseEntry.id },
          select: { id: true },
        })

        if (existing) {
          if (options?.forceRegenerate) {
            // Re-calcular score do tema existente
            try {
              await this.scoringService.calculateScore(existing.id)
              updated++
            } catch {
              skipped++
            }
          } else {
            skipped++
          }
        } else {
          // Criar novo tema
          const newTheme = await prisma.theme.create({
            data: {
              title,
              painId: pain.id,
              caseId: caseEntry.id,
              solutionPatternId: pattern.id,
              status: 'ACTIVE',
              isNew: true,
              opportunityScore: 0,
              conversionScore: 0,
            },
          })

          // Calcular score inicial
          try {
            await this.scoringService.calculateScore(newTheme.id)
          } catch {
            // Score permanece 0 se falhar — não bloquear criação
          }

          created++
        }
      }
    }

    const durationMs = Date.now() - start

    // Audit log (COMP-001)
    try {
      const level = created === 0 && updated === 0 ? 'WARN' : 'INFO'
      await prisma.alertLog.create({
        data: {
          type: 'AUDIT',
          severity: level,
          message: JSON.stringify({
            action: 'theme.generate',
            entityType: 'Theme',
            entityId: SYSTEM_OPERATOR_ID,
            metadata: {
              created,
              updated,
              skipped,
              durationMs,
              forceRegenerate: options?.forceRegenerate ?? false,
            },
          }),
          resolved: true,
        },
      })
    } catch (logErr) {
      // Falha no log não deve propagar — registrar no Sentry como warning
      captureException(logErr, { service: 'ThemeGenerationService', step: 'audit-log' })
    }

    // TASK-3 ST004: se LTR ativo, reprirorizar temas com dados de conversão (CL-073)
    try {
      const ltrActive = await isLtrActive()
      if (ltrActive) {
        console.info('[ThemeGeneration] LTR ativado — ranking agora usa dados de conversão')
        await recalculateIfActive()
      }
    } catch (ltrErr) {
      // LTR não bloqueia geração de temas — logar e continuar
      captureException(ltrErr, { service: 'ThemeGenerationService', step: 'ltr-recalculate' })
    }

    return { created, updated, skipped, durationMs, degradedMode, mode }
  }
}

export const themeGenerationService = new ThemeGenerationService()
