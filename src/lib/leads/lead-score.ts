// Inbound F3 — motor de lead scoring. recomputeLeadScore deriva o score dos sinais
// JA capturados (ConversionEvents + perfil), grava Lead.score e promove NEW->MQL ao
// cruzar o threshold (com alerta + ledger). Idempotente (recomputa do zero). SEC-008.
import 'server-only'
import { prisma } from '@/lib/prisma'
import { sendAlertEmail } from '@/lib/alert-email'
import { emitAutomationEvent } from '@/lib/automation/engine'

export interface ScoringConfig {
  mqlThreshold: number
  conversionPoints: Record<string, number>
  profile: { hasCompany: number; hasName: number }
}

export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  mqlThreshold: 100,
  conversionPoints: {
    CONVERSATION: 10,
    FORM_SUBMISSION: 15,
    MEETING: 40,
    CALENDAR_BOOKING: 50,
    PROPOSAL: 60,
  },
  profile: { hasCompany: 10, hasName: 5 },
}

async function getConfig(): Promise<ScoringConfig> {
  try {
    const s = await prisma.systemSetting.findUnique({ where: { key: 'lead_scoring.config' } })
    const v = s?.value
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const o = v as Partial<ScoringConfig>
      return {
        mqlThreshold: typeof o.mqlThreshold === 'number' ? o.mqlThreshold : DEFAULT_SCORING_CONFIG.mqlThreshold,
        conversionPoints: { ...DEFAULT_SCORING_CONFIG.conversionPoints, ...(o.conversionPoints ?? {}) },
        profile: { ...DEFAULT_SCORING_CONFIG.profile, ...(o.profile ?? {}) },
      }
    }
  } catch {
    /* fallback p/ default */
  }
  return DEFAULT_SCORING_CONFIG
}

export interface ScoreInputs {
  name?: string | null
  company?: string | null
  conversionTypes: string[]
}

/** Puro: calcula o score a partir dos sinais + config. */
export function computeScore(inputs: ScoreInputs, cfg: ScoringConfig = DEFAULT_SCORING_CONFIG): number {
  let score = 0
  for (const type of inputs.conversionTypes) score += cfg.conversionPoints[type] ?? 0
  if (inputs.company) score += cfg.profile.hasCompany
  if (inputs.name) score += cfg.profile.hasName
  return score
}

export interface RecomputeResult {
  score: number
  mqlReached: boolean
}

export async function recomputeLeadScore(leadId: string): Promise<RecomputeResult | null> {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: { id: true, name: true, company: true, status: true, score: true, mqlAt: true },
  })
  if (!lead) return null

  const [cfg, events] = await Promise.all([
    getConfig(),
    prisma.conversionEvent.findMany({ where: { leadId }, select: { type: true } }),
  ])

  const newScore = computeScore(
    { name: lead.name, company: lead.company, conversionTypes: events.map((e) => e.type) },
    cfg,
  )
  const mqlReached = newScore >= cfg.mqlThreshold && lead.status === 'NEW' && lead.mqlAt == null

  if (newScore === lead.score && !mqlReached) {
    return { score: newScore, mqlReached: false }
  }

  const now = new Date()
  await prisma.lead.update({
    where: { id: leadId },
    data: {
      score: newScore,
      scoreUpdatedAt: now,
      ...(mqlReached ? { status: 'MQL' as const, mqlAt: now, statusUpdatedAt: now } : {}),
    },
  })

  if (newScore !== lead.score) {
    await prisma.leadScoreEvent
      .create({ data: { leadId, delta: newScore - lead.score, newTotal: newScore, reason: mqlReached ? 'mql_reached' : 'recompute' } })
      .catch(() => undefined)
  }

  if (mqlReached) {
    // SEC-008: alerta sem PII — apenas leadId + score.
    void sendAlertEmail({
      subject: '🔥 Lead qualificado (MQL) — Inbound Forge',
      body: `Lead ${leadId} atingiu ${newScore} pontos (threshold ${cfg.mqlThreshold}) e foi promovido a MQL.\n\nDashboard: /leads`,
      severity: 'INFO',
      logType: 'lead_mql',
      metadata: { leadId, score: newScore },
    }).catch(() => undefined)
    // F5: dispara automacoes do trigger LEAD_MQL (notify/enroll/set-stage).
    void emitAutomationEvent('LEAD_MQL', { leadId }).catch(() => undefined)
  }

  return { score: newScore, mqlReached }
}
