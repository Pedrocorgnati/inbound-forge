/**
 * NOTIF-content-published: Email ao publicar conteúdo
 * Rastreabilidade: TASK-9/ST002, F-026, NOTIFICATION-SPEC canal email
 *
 * Catch silencioso — falha no email nunca bloqueia a feature principal.
 * Enviado de forma assíncrona (void) no route handler.
 */
import { sendAlertEmail } from '@/lib/alert-email'
import { withUtm } from '@/lib/utm-builder'

interface ContentPublishedParams {
  postTitle: string
  channel: string
  publishedAt: Date
  postUrl?: string
}

export async function sendContentPublishedEmail(params: ContentPublishedParams): Promise<void> {
  const { postTitle, channel, publishedAt, postUrl } = params
  const timestamp = publishedAt.toISOString()
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.inbound-forge.app'

  const lines = [
    `Título: ${postTitle}`,
    `Canal: ${channel}`,
    `Publicado em: ${timestamp}`,
  ]
  if (postUrl) {
    // TASK-13 ST004 (CL-174): UTM em link outbound do conteúdo publicado
    const taggedUrl = withUtm(postUrl, { source: 'email', medium: 'email', campaign: 'content-published' })
    lines.push(`URL: ${taggedUrl}`)
  }
  lines.push('', `Dashboard: ${baseUrl}/posts`)

  await sendAlertEmail({
    subject: `✅ Conteúdo publicado — ${postTitle}`,
    body: lines.join('\n'),
    severity: 'INFO',
    logType: 'content_published',
    metadata: { postTitle, channel, publishedAt: timestamp, postUrl },
  })
}
