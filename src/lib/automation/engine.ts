// Inbound F5 — motor de automacao trigger->acao. emitAutomationEvent e chamado
// fire-and-forget nos pontos onde o app ja emite sinais de lead (criado, status, MQL).
// Acoes reusam infra existente: NOTIFY (alert-email/F1), SET_FUNNEL_STAGE (Lead),
// ENROLL_SEQUENCE (F4). Cada execucao e auditada em AutomationRun. SEC-008: sem PII.
import 'server-only'
import type { AutomationTrigger, AutomationRule } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { sendAlertEmail } from '@/lib/alert-email'
import { enrollInSequence } from '@/lib/email/nurture'

export interface AutomationContext {
  leadId: string
  newStatus?: string
}

type RunStatus = 'SUCCESS' | 'FAILED' | 'SKIPPED'

async function runAction(rule: AutomationRule, ctx: AutomationContext): Promise<{ status: RunStatus; detail: string | null }> {
  const cfg = (rule.actionConfig ?? {}) as Record<string, unknown>
  switch (rule.actionType) {
    case 'NOTIFY':
      await sendAlertEmail({
        subject: `⚙ Automacao: ${rule.name}`,
        body: `Regra "${rule.name}" (trigger ${rule.trigger}) disparada para o lead ${ctx.leadId}.${typeof cfg.note === 'string' ? `\n\n${cfg.note}` : ''}\n\nDashboard: /leads`,
        severity: 'INFO',
        logType: 'automation',
        metadata: { ruleId: rule.id, leadId: ctx.leadId },
      })
      return { status: 'SUCCESS', detail: null }

    case 'SET_FUNNEL_STAGE': {
      const stage = cfg.funnelStage
      if (stage !== 'AWARENESS' && stage !== 'CONSIDERATION' && stage !== 'DECISION') {
        return { status: 'SKIPPED', detail: 'invalid_funnel_stage' }
      }
      await prisma.lead.update({ where: { id: ctx.leadId }, data: { funnelStage: stage } })
      return { status: 'SUCCESS', detail: `funnel_stage=${stage}` }
    }

    case 'ENROLL_SEQUENCE': {
      const sequenceId = cfg.sequenceId
      if (typeof sequenceId !== 'string') return { status: 'SKIPPED', detail: 'missing_sequenceId' }
      const sub = await prisma.emailSubscriber.findFirst({ where: { leadId: ctx.leadId }, select: { id: true } })
      if (!sub) return { status: 'SKIPPED', detail: 'no_subscriber_for_lead' }
      const ok = await enrollInSequence(sub.id, sequenceId)
      return { status: ok ? 'SUCCESS' : 'SKIPPED', detail: ok ? `enrolled:${sequenceId}` : 'already_or_inactive' }
    }

    default:
      return { status: 'SKIPPED', detail: 'unknown_action' }
  }
}

/** Dispara as regras habilitadas para o trigger. Fire-and-forget (caller usa void). */
export async function emitAutomationEvent(trigger: AutomationTrigger, ctx: AutomationContext): Promise<void> {
  let rules: AutomationRule[]
  try {
    rules = await prisma.automationRule.findMany({ where: { trigger, enabled: true } })
  } catch {
    return
  }
  for (const rule of rules) {
    let status: RunStatus = 'SUCCESS'
    let detail: string | null = null
    try {
      const r = await runAction(rule, ctx)
      status = r.status
      detail = r.detail
    } catch (e) {
      status = 'FAILED'
      detail = (e instanceof Error ? e.message : 'unknown').slice(0, 500)
    }
    await prisma.automationRun
      .create({ data: { ruleId: rule.id, trigger, entityId: ctx.leadId, status, detail } })
      .catch(() => undefined)
  }
}
