/**
 * UI timing constants — Inbound Forge
 * Centraliza todos os setTimeout/setInterval usados para feedback visual.
 * Zero magic numbers — sempre importar daqui.
 */

export const UI_TIMING = {
  /** Feedback de "copiado" — ícone de sucesso (copy buttons) */
  COPY_FEEDBACK_MS: 2000,

  /** Feedback de "copiado" em overlay de debug (DataTestOverlay) */
  COPY_FEEDBACK_DEV_MS: 1500,

  /** Mensagem de aprovação visível após aprovar conteúdo */
  APPROVAL_SUCCESS_MS: 4000,

  /** Reset de estado 'idle' após ação de publicação (Instagram, CopyButton) */
  PUBLISH_STATE_RESET_MS: 2000,

  /** Reset de estado 'idle' em caso de erro de publicação */
  PUBLISH_ERROR_RESET_MS: 3000,
} as const

export type UITimingKey = keyof typeof UI_TIMING
