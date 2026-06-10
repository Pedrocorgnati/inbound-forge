// Intake-Review TASK-21 ST006 (CL-OP-028): versioning explicito de Terms/Privacy.
// Futuro: comparar com `user.acceptedTermsVersion` em middleware/layout e pedir re-aceite.

export type LegalDoc = 'terms' | 'privacy' | 'cookies'

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
  cookies: {
    version: '1.0.0',
    lastUpdated: '2026-04-24',
  },
}

// IB-I18N-01: cabecalho de versao localizado por locale (antes era PT fixo dentro
// de paginas traduzidas). Sem travessao na copy ao usuario (house style).
const HEADER_FORMATS: Record<string, (version: string, date: string) => string> = {
  'pt-BR': (version, date) => `Versao ${version} - ultima atualizacao: ${date}`,
  'en-US': (version, date) => `Version ${version} - last updated: ${date}`,
  'it-IT': (version, date) => `Versione ${version} - ultimo aggiornamento: ${date}`,
  'es-ES': (version, date) => `Version ${version} - ultima actualizacion: ${date}`,
}

export function formatLegalHeader(doc: LegalDoc, locale: string): string {
  const v = LEGAL_VERSIONS[doc]
  const dateFmt = new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: '2-digit',
  })
  const fmt = HEADER_FORMATS[locale] ?? HEADER_FORMATS['pt-BR']
  return fmt(v.version, dateFmt.format(new Date(v.lastUpdated)))
}
