/**
 * Social Locale Policy — TASK-14 ST003 (CL-162)
 *
 * Politica explicita: posts sociais (Instagram, LinkedIn, WhatsApp, TikTok,
 * YouTube) SAEM APENAS em pt-BR no MVP. Blog e email-newsletter sao
 * multilingues (pt-BR, en-US, it-IT, es-ES).
 *
 * Este modulo e thin wrapper sobre `channel-locale-gate.ts` (canonico), criado
 * para satisfazer o contrato da TASK-14 sem duplicar logica. Use:
 *
 *   import { assertPtBRForSocial } from '@/lib/i18n/social-locale-policy'
 *   assertPtBRForSocial('en-US')  // throws ChannelLocaleGateError
 *
 * Motivacao: INTAKE §"Blog Interno" — "Posts sociais (LinkedIn, Instagram)
 * permanecem em pt-BR no MVP."
 */
import {
  assertChannelLocale,
  isChannelAllowedForLocale,
  ChannelLocaleGateError,
} from '@/lib/publishing/channel-locale-gate'

/** Lista canonica de canais sociais restritos a pt-BR. */
export const SOCIAL_CHANNELS = ['INSTAGRAM', 'LINKEDIN', 'WHATSAPP', 'TIKTOK', 'YOUTUBE'] as const
export type SocialChannel = (typeof SOCIAL_CHANNELS)[number]

/**
 * Lanca `ChannelLocaleGateError` quando `locale !== 'pt-BR'`.
 * Equivalente a `assertChannelLocale('INSTAGRAM', locale)` — usa INSTAGRAM como
 * sentinela generica de "canal social" ja que a regra e identica para todos.
 */
export function assertPtBRForSocial(locale: string): void {
  assertChannelLocale('INSTAGRAM', locale)
}

/** Variante sem throw — retorna boolean. */
export function isPtBRLocale(locale: string): boolean {
  return isChannelAllowedForLocale('INSTAGRAM', locale)
}

/** Valida por canal especifico, util em adapters. */
export function assertSocialLocale(channel: string, locale: string): void {
  assertChannelLocale(channel, locale)
}

export { ChannelLocaleGateError }
