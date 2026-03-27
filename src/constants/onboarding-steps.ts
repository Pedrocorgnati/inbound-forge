export const ONBOARDING_STEPS = [
  { id: 1, key: 'welcome',      title: 'Bem-vindo ao Inbound Forge',  optional: false },
  { id: 2, key: 'credentials',  title: 'Configurar Credenciais API',  optional: false },
  { id: 3, key: 'first-case',   title: 'Primeiro Case de Sucesso',    optional: false },
  { id: 4, key: 'pains',        title: 'Dores do Cliente',            optional: false },
  { id: 5, key: 'solutions',    title: 'Padrões de Solução',          optional: false },
  { id: 6, key: 'objections',   title: 'Objeções Comuns',             optional: true  },
  { id: 7, key: 'activation',   title: 'Ativação',                    optional: false },
] as const

// Tipo derivado — nunca hardcode string nas tasks, usar este tipo
export type OnboardingStepKey = typeof ONBOARDING_STEPS[number]['key']
// Resultado: 'welcome' | 'credentials' | 'first-case' | 'pains' | 'solutions' | 'objections' | 'activation'

export const TOTAL_REQUIRED_STEPS = ONBOARDING_STEPS.filter(s => !s.optional).length
// Valor: 6
