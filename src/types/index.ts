// Re-export enums (CX-07)
export * from './enums'

// Re-export base types
export { type BaseEntity, type ApiResponse, type PaginatedResponse } from './base'

// Re-export domain types
export { type WorkerHeartbeat } from './worker'
export { type UTMParams } from './utm'
export { BUSINESS_RULES, type BusinessRule } from './constants'

// Navigation types (definidos apenas aqui)
export interface NavItem {
  labelKey: string
  href: string
  icon: string
  badgeKey?: 'pendingEntries' | 'pendingContent' | 'pendingPublish' | 'pendingReconciliation' | null
}

export interface SidebarBadges {
  pendingEntries?: number
  pendingContent?: number
  pendingPublish?: number
  pendingReconciliation?: number
}

export interface ProgressWidgetData {
  published: number
  scheduled: number
  target: number
}

// Locale
export type Locale = 'pt-BR' | 'en-US' | 'it-IT' | 'es-ES'
export const SUPPORTED_LOCALES: Locale[] = ['pt-BR', 'en-US', 'it-IT', 'es-ES']
export const DEFAULT_LOCALE: Locale = 'pt-BR'
