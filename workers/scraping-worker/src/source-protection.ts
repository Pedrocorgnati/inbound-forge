/**
 * Source Protection Guard — local mirror of `src/lib/scraping/source-protection.ts`
 * (TASK-11 ST003 / CL-111). Mantido local porque o worker tem `rootDir: src`
 * e nao importa do monorepo pai. Mudancas aqui devem ser espelhadas na lib
 * canonica em `src/lib/scraping/source-protection.ts`.
 */

export interface ProtectableSource {
  isProtected?: boolean | null
  antiBotBlocked?: boolean | null
  protectionUntil?: Date | string | null
}

export interface ProtectionReason {
  protected: boolean
  reasons: Array<'curated' | 'anti-bot' | 'protection-until'>
}

function parseDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null
  if (value instanceof Date) return value
  const d = new Date(value)
  return isNaN(d.getTime()) ? null : d
}

export function isProtected(source: ProtectableSource, now: Date = new Date()): boolean {
  return describeProtection(source, now).protected
}

export function describeProtection(source: ProtectableSource, now: Date = new Date()): ProtectionReason {
  const reasons: ProtectionReason['reasons'] = []
  if (source.isProtected === true) reasons.push('curated')
  if (source.antiBotBlocked === true) reasons.push('anti-bot')
  const until = parseDate(source.protectionUntil ?? null)
  if (until && until.getTime() > now.getTime()) reasons.push('protection-until')
  return { protected: reasons.length > 0, reasons }
}

export function filterUnprotected<T extends ProtectableSource>(sources: T[], now: Date = new Date()): T[] {
  return sources.filter((s) => !isProtected(s, now))
}
