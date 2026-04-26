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

/**
 * TASK-3 ST001: Thresholds de ativação do Learn-to-Rank (CL-030, CL-071).
 * LTR se ativa automaticamente quando ambos os thresholds são atingidos.
 */
export const LTR_THRESHOLDS = {
  postsRequired: 50,        // posts publicados para ativar LTR
  conversionsRequired: 10,  // conversões registradas para ativar LTR
  minPostsPerTheme: 5,      // mínimo de posts antes de penalizar tema
  boostMultiplier: 1.3,     // boost para temas acima da média de conversão
  penaltyMultiplier: 0.7,   // penalidade para temas sem conversão com 5+ posts
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
