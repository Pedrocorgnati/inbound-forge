/**
 * Rastreabilidade: CL-305, TASK-4 ST001
 * Canal Slack: envia alertas via webhook.
 */

export interface SlackBlock {
  type: 'section' | 'divider'
  text?: { type: 'mrkdwn'; text: string }
}

export interface SlackPayload {
  text: string
  blocks?: SlackBlock[]
}

const SEVERITY_EMOJI: Record<string, string> = {
  low: ':white_circle:',
  medium: ':large_yellow_circle:',
  high: ':large_orange_circle:',
  critical: ':red_circle:',
  INFO: ':white_circle:',
  WARNING: ':large_yellow_circle:',
  ERROR: ':large_orange_circle:',
  CRITICAL: ':red_circle:',
}

export function buildSlackPayload(alert: {
  type: string
  severity: string
  message: string
  id?: string
}): SlackPayload {
  const emoji = SEVERITY_EMOJI[alert.severity] ?? ':white_circle:'
  const title = `${emoji} *[${alert.severity.toUpperCase()}]* ${alert.type}`
  const text = `${title}\n${alert.message}${alert.id ? `\n_id: ${alert.id}_` : ''}`
  return {
    text,
    blocks: [
      { type: 'section', text: { type: 'mrkdwn', text } },
      { type: 'divider' },
    ],
  }
}

export async function sendSlackAlert(alert: {
  type: string
  severity: string
  message: string
  id?: string
}): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL
  if (!webhookUrl) {
    console.warn('[alerts/slack] SLACK_WEBHOOK_URL não configurado — skip')
    return
  }

  const payload = buildSlackPayload(alert)
  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(5_000),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Slack webhook falhou (${res.status}): ${body}`)
  }
}
