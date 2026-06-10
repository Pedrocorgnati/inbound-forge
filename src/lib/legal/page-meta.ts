// IB-I18N-01: META (title/description) por locale das paginas legais.
// Vive FORA do page.tsx porque o App Router do Next proibe exports nomeados
// arbitrarios em page.tsx (apenas default, generateMetadata, metadata, etc.).
// Importado pela page (generateMetadata) e pelo teste de paridade de locale.

export interface LegalPageMeta {
  title: string
  description: string
}

export const PRIVACY_META: Record<string, LegalPageMeta> = {
  'pt-BR': {
    title: 'Política de Privacidade | Inbound Forge',
    description: 'Saiba como o Inbound Forge coleta, utiliza e protege seus dados pessoais conforme a LGPD.',
  },
  'en-US': {
    title: 'Privacy Policy | Inbound Forge',
    description: 'Learn how Inbound Forge collects, uses and protects your personal data under Brazil’s LGPD.',
  },
  'it-IT': {
    title: 'Informativa sulla Privacy | Inbound Forge',
    description: 'Scopri come Inbound Forge raccoglie, utilizza e protegge i tuoi dati personali ai sensi della LGPD.',
  },
  'es-ES': {
    title: 'Política de Privacidad | Inbound Forge',
    description: 'Conoce cómo Inbound Forge recopila, utiliza y protege tus datos personales conforme a la LGPD.',
  },
}

export const COOKIES_META: Record<string, LegalPageMeta> = {
  'pt-BR': {
    title: 'Politica de Cookies | Inbound Forge',
    description: 'Como o Inbound Forge utiliza cookies, categorias, finalidades, tempo de retencao e como gerenciar suas preferencias conforme a LGPD.',
  },
  'en-US': {
    title: 'Cookie Policy | Inbound Forge',
    description: 'How Inbound Forge uses cookies: categories, purposes, retention periods, and how to manage your preferences under the LGPD.',
  },
  'it-IT': {
    title: 'Informativa sui Cookie | Inbound Forge',
    description: 'Come Inbound Forge utilizza i cookie: categorie, finalita, tempi di conservazione e come gestire le tue preferenze ai sensi della LGPD.',
  },
  'es-ES': {
    title: 'Politica de Cookies | Inbound Forge',
    description: 'Como Inbound Forge utiliza cookies: categorias, finalidades, plazos de retencion y como gestionar tus preferencias conforme a la LGPD.',
  },
}
