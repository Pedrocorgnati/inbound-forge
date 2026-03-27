/**
 * Thresholds da Knowledge Base para desbloquear o motor de temas.
 * Cases é o critério principal — overallUnlocked = cases >= KNOWLEDGE_THRESHOLDS.cases
 */
export const KNOWLEDGE_THRESHOLDS = {
  cases: 5,       // mínimo para desbloquear análise de temas
  pains: 5,       // recomendado
  patterns: 3,    // recomendado
  objections: 5,  // recomendado
} as const

/** Mensagens de nudge contextual por estado do operador (INT-008/INT-010). */
export const THRESHOLD_NUDGES = {
  cases_zero: 'Comece adicionando seu primeiro case de sucesso. Cases provam que você resolve o problema.',
  cases_partial: (count: number): string =>
    `${count}/5 cases adicionados. Adicione ${5 - count} mais para desbloquear a análise de temas.`,
  cases_reached: 'Base de conhecimento pronta! O motor de temas pode começar a análise.',
  pains_zero: 'Adicione dores do seu público-alvo. Quanto mais específico, melhor o posicionamento.',
  patterns_low: 'Padrões de solução conectam dores a cases. Adicione pelo menos 3.',
} as const
