// Module-11: Constantes do Blog SEO/GEO
// Rastreabilidade: FEAT-publishing-blog-001, NEXT-002

/** ISR revalidation: 1 hora (conteúdo muda raramente — performance > freshness) */
export const BLOG_REVALIDATE = 3600

/** Status possíveis de artigos (espelha ArticleStatus enum do Prisma) */
export const BLOG_ARTICLE_STATUSES = ['DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED'] as const

export const DEFAULT_AUTHOR = 'Pedro Corgnati'

/** metaDescription não pode exceder 160 chars (VAL_020) */
export const MAX_META_DESCRIPTION_LENGTH = 160

/** metaTitle recomendado ≤ 70 chars para Google SERP */
export const MAX_META_TITLE_LENGTH = 70

/** Tipos de JSON-LD suportados (schema.org) */
export const BLOG_JSON_LD_TYPES = ['BlogPosting', 'FAQPage', 'HowTo'] as const

/** JSON-LD aplicado a todo artigo por padrão */
export const BLOG_DEFAULT_SCHEMA_TYPES = ['BlogPosting']

/** Cache da OG image gerada pelo Satori (edge runtime) — 24h */
export const BLOG_OG_IMAGE_CACHE_SECONDS = 86400

/** Número mínimo de pares Q&A para gerar FAQPage schema */
export const BLOG_FAQ_MIN_PAIRS = 2

/** Número mínimo de passos numerados para gerar HowTo schema */
export const BLOG_HOWTO_MIN_STEPS = 3

/** Palavras por minuto para cálculo de tempo de leitura */
export const BLOG_READING_WPM = 250
