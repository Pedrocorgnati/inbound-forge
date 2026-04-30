/**
 * NOTIF-lead-captured: Email ao capturar lead
 * Rastreabilidade: TASK-9/ST002, F-026, NOTIFICATION-SPEC canal email
 * SEC-008: NUNCA inclui PII (contactInfo) — apenas metadados de canal/UTM.
 *
 * Catch silencioso — falha no email nunca bloqueia a feature principal.
 * Enviado de forma assíncrona (void) no route handler.
 */
import { sendAlertEmail } from '@/lib/alert-email'

interface LeadCapturedParams {
  leadSource?: string | null
  utmCampaign?: string | null
  capturedAt: Date
}

export async function sendLeadCapturedEmail(params: LeadCapturedParams): Promise<void> {
  const { leadSource, utmCampaign, capturedAt } = params
  const timestamp = capturedAt.toISOString()
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.inbound-forge.app'

  const lines = [
    `Capturado em: ${timestamp}`,
    leadSource ? `Fonte: ${leadSource}` : 'Fonte: direta',
    utmCampaign ? `Campanha UTM: ${utmCampaign}` : '',
    '',
    `Dashboard de leads: ${baseUrl}/leads`,
    '',
    'Nota: dados de contato criptografados — acesse o dashboard para detalhes.',
  ].filter((l) => l !== undefined)

  await sendAlertEmail({
    subject: '🎯 Novo lead capturado',
    body: lines.join('\n'),
    severity: 'INFO',
    logType: 'lead_captured',
    metadata: { leadSource: leadSource ?? null, utmCampaign: utmCampaign ?? null, capturedAt: timestamp },
  })
}
