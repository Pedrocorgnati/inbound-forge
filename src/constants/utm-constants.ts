/**
 * Constants UTM — Inbound Forge
 * Rastreabilidade: INT-028
 */

export const UTM_SOURCES = {
  INBOUND_FORGE: 'inbound-forge',
} as const

export const UTM_MEDIUMS = {
  WHATSAPP: 'whatsapp',
  BLOG: 'blog',
  LINKEDIN: 'linkedin',
  INSTAGRAM: 'instagram',
} as const

export const WHATSAPP_UTM_CONFIG = {
  source: UTM_SOURCES.INBOUND_FORGE,
  medium: UTM_MEDIUMS.WHATSAPP,
} as const

export const BLOG_UTM_CONFIG = {
  source: UTM_SOURCES.INBOUND_FORGE,
  medium: UTM_MEDIUMS.BLOG,
} as const
