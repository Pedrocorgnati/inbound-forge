/**
 * Storage key constants — Inbound Forge
 * Centraliza todos os getItem/setItem do localStorage e sessionStorage.
 * Zero strings soltas — sempre importar daqui.
 */

export const STORAGE_KEYS = {
  /** Estado do wizard de onboarding (passo atual, credenciais testadas) */
  ONBOARDING: 'inbound-forge-onboarding',

  /** Estado colapsado/expandido do sidebar */
  SIDEBAR_COLLAPSED: 'sidebar:collapsed',

  /** Preferência de visualização do calendário (lista vs grade) */
  CALENDAR_LIST_VIEW: 'calendar-list-view',

  /** Tema da interface (light | dark | system) — alinhado com ThemeProvider.storageKey default */
  THEME: 'inbound-forge-theme',
} as const

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS]
