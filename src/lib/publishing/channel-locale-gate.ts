/**
 * Channel × Locale Gate — Intake Review TASK-9 ST005 (CL-167).
 * Posts sociais (Instagram / LinkedIn / WhatsApp) so saem em pt-BR nesta fase.
 * Blog e email-newsletter seguem multilingues.
 */

export class ChannelLocaleGateError extends Error {
  constructor(
    public readonly channel: string,
    public readonly locale: string,
  ) {
    super(`Canal ${channel} restrito a locale pt-BR (recebeu ${locale})`)
    this.name = 'ChannelLocaleGateError'
  }
}

const PT_BR_ONLY_CHANNELS = new Set(['INSTAGRAM', 'LINKEDIN', 'WHATSAPP'])

export function isChannelAllowedForLocale(channel: string | null | undefined, locale: string): boolean {
  if (!channel) return true
  const ch = channel.toUpperCase()
  if (PT_BR_ONLY_CHANNELS.has(ch) && locale !== 'pt-BR') return false
  return true
}

export function assertChannelLocale(channel: string | null | undefined, locale: string): void {
  if (!isChannelAllowedForLocale(channel, locale)) {
    throw new ChannelLocaleGateError(channel!, locale)
  }
}
