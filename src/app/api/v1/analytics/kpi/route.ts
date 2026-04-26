/**
 * GET /api/v1/analytics/kpi — KPI de reunioes qualificadas + custo mensal
 * Rastreabilidade: CL-133, CL-128, TASK-7 ST003
 */
import { NextRequest } from 'next/server'
import { requireSession, ok, internalError } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { getMonthlyCostSummary, getMonthlyTotalAll, MONTHLY_COST_TARGET_USD } from '@/lib/cost-tracking'

const MEETING_GOAL_PER_MONTH = 1 // meta: 1 reuniao qualificada/mes (configuravel)
const HISTORY_MONTHS = 6

export async function GET(request: NextRequest) {
  const { response } = await requireSession()
  if (response) return response

  // RESOLVED: G002 — locale dinâmico via query param em vez de 'pt-BR' hardcoded
  const locale = request.nextUrl.searchParams.get('locale') ?? 'pt-BR'

  try {
    const now = new Date()

    // ─── Reunioes qualificadas: historico 6 meses ─────────────────────────────
    const meetingHistory: Array<{ month: string; meetings: number; goalMet: boolean }> = []

    for (let i = HISTORY_MONTHS - 1; i >= 0; i--) {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const endOfMonth   = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59)

      const count = await prisma.conversionEvent.count({
        where: {
          type: 'MEETING',
          occurredAt: { gte: startOfMonth, lte: endOfMonth },
        },
      })

      meetingHistory.push({
        month: startOfMonth.toLocaleDateString(locale, { month: 'short', year: 'numeric' }),
        meetings: count,
        goalMet: count >= MEETING_GOAL_PER_MONTH,
      })
    }

    const currentMonthMeetings = meetingHistory[meetingHistory.length - 1]?.meetings ?? 0

    // ─── Custos do mes atual ──────────────────────────────────────────────────
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const [costSummary, totalCostUsd] = await Promise.all([
      getMonthlyCostSummary(startOfCurrentMonth),
      getMonthlyTotalAll(startOfCurrentMonth),
    ])

    console.info(`[kpi] GET meetings=${currentMonthMeetings} totalCost=$${totalCostUsd.toFixed(2)}`)

    return ok({
      meetings: {
        current: currentMonthMeetings,
        goal: MEETING_GOAL_PER_MONTH,
        goalMet: currentMonthMeetings >= MEETING_GOAL_PER_MONTH,
        history: meetingHistory,
      },
      cost: {
        totalUsd: totalCostUsd,
        targetUsd: MONTHLY_COST_TARGET_USD,
        percentUsed: Math.round((totalCostUsd / MONTHLY_COST_TARGET_USD) * 100),
        withinBudget: totalCostUsd <= MONTHLY_COST_TARGET_USD,
        breakdown: costSummary,
      },
    })
  } catch (err) {
    console.error('[kpi] GET error:', err)
    return internalError()
  }
}
