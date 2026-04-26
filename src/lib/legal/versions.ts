// Intake-Review TASK-21 ST006 (CL-OP-028): versioning explicito de Terms/Privacy.
// Futuro: comparar com `user.acceptedTermsVersion` em middleware/layout e pedir re-aceite.

export type LegalDoc = 'terms' | 'privacy'

export interface LegalVersion {
  version: string
  lastUpdated: string // ISO YYYY-MM-DD
  changelogPath?: string
}

export const LEGAL_VERSIONS: Record<LegalDoc, LegalVersion> = {
  terms: {
    version: '1.0.0',
    lastUpdated: '2026-04-24',
  },
  privacy: {
    version: '1.0.0',
    lastUpdated: '2026-04-24',
  },
}

export function formatLegalHeader(doc: LegalDoc, locale: string): string {
  const v = LEGAL_VERSIONS[doc]
  const dateFmt = new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: '2-digit',
  })
  return `Versao ${v.version} — ultima atualizacao: ${dateFmt.format(new Date(v.lastUpdated))}`
}
