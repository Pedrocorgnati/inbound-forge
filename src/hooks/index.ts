// Foundation hooks (cross-module — milestone-2 design system)
// Domain-specific hooks (themes, knowledge, content, calendar, leads, assets,
// health, funnel, reconciliation) ficam fora do barrel: importar diretamente
// pelo path completo para tornar dependencia de modulo explicita.

export { useAuth } from './useAuth'
export { useApiError } from './useApiError'
export { useAutosave } from './useAutosave'
export { useCsrfToken } from './useCsrfToken'
export { useDebounce } from './useDebounce'
export { useInactivityTimer } from './useInactivityTimer'
export { useKeyboardShortcuts } from './useKeyboardShortcuts'
export { useKnowledgeProgress } from './useKnowledgeProgress'
export { useNetworkStatus } from './useNetworkStatus'
export { usePagination } from './usePagination'
export { useReducedMotion } from './useReducedMotion'
export { useRovingTabIndex } from './useRovingTabIndex'
export { useSessionExpiration } from './useSessionExpiration'
export { useSidebarState } from './useSidebarState'
