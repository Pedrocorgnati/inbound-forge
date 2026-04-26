/**
 * Source Protection Guard — TASK-11 ST003 (CL-111)
 *
 * Centraliza a decisao "esta fonte deve ser scraped agora?".
 * Cobre os dois tipos de protecao existentes no schema:
 *  - `isProtected` (INT-093): fontes curadas de seed, non-retry permanente por operador.
 *  - `antiBotBlocked` (CL-030): marcacao de runtime quando o site bloqueou o scraper.
 *
 * Suporta opcionalmente um campo `protectionUntil` (timestamp futuro) — caso
 * uma migration futura adicione TTL de protecao. Por ora esse campo e tolerado
 * como opcional e, se presente e futuro, conta como protecao ativa.
 */

export interface ProtectableSource {
  isProtected?: boolean | null
  antiBotBlocked?: boolean | null
  /** Opcional — timestamp ate quando a fonte deve ser ignorada (ex.: backoff). */
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

/** Retorna `true` quando a fonte esta protegida e nao deve ser enfileirada. */
export function isProtected(source: ProtectableSource, now: Date = new Date()): boolean {
  return describeProtection(source, now).protected
}

/** Versao detalhada — util para logs e auditoria. */
export function describeProtection(source: ProtectableSource, now: Date = new Date()): ProtectionReason {
  const reasons: ProtectionReason['reasons'] = []
  if (source.isProtected === true) reasons.push('curated')
  if (source.antiBotBlocked === true) reasons.push('anti-bot')
  const until = parseDate(source.protectionUntil ?? null)
  if (until && until.getTime() > now.getTime()) reasons.push('protection-until')
  return { protected: reasons.length > 0, reasons }
}

/** Filtra uma lista de sources mantendo apenas as elegiveis para scraping. */
export function filterUnprotected<T extends ProtectableSource>(sources: T[], now: Date = new Date()): T[] {
  return sources.filter((s) => !isProtected(s, now))
}
