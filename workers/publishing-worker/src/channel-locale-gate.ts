/**
 * Channel × Locale Gate — espelho local do worker.
 *
 * O publishing-worker e um package separado e NAO pode importar `@/lib/...` do
 * app Next.js (quebraria o build Docker self-contained). Este arquivo espelha
 * `src/lib/publishing/channel-locale-gate.ts` — ao evoluir a regra de locale por
 * canal, atualizar AMBOS os lados (mesmo contrato do espelho de adapters em
 * publisher.ts).
 *
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
