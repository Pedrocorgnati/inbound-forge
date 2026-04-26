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

// ─── Metadados de carousel/nudge ─────────────────────────────────────────────
// Usado por OnboardingCarousel e NudgeTooltip. Campos extras não afetam o wizard.

export const ONBOARDING_STEPS_WITH_META = [
  {
    id: 1,
    key: 'welcome',
    title: 'Bem-vindo ao Inbound Forge',
    optional: false,
    suggestion: 'Explore o wizard e conheça o fluxo completo antes de começar.',
    nudgeMessage: 'Em poucos minutos você terá um motor de temas personalizados para o seu negócio.',
  },
  {
    id: 2,
    key: 'credentials',
    title: 'Configurar Credenciais API',
    optional: false,
    suggestion: 'Anthropic e Supabase são obrigatórios. Ideogram e Instagram desbloqueiam imagens e publicação.',
    nudgeMessage: 'Credenciais ficam criptografadas no servidor — nunca expostas no front-end.',
  },
  {
    id: 3,
    key: 'first-case',
    title: 'Primeiro Case de Sucesso',
    optional: false,
    suggestion: 'Descreva um resultado concreto que você entregou ao cliente.',
    nudgeMessage: 'Cases reais aumentam a precisão dos temas gerados. Quanto mais específico, melhor.',
  },
  {
    id: 4,
    key: 'pains',
    title: 'Dores do Cliente',
    optional: false,
    suggestion: 'Liste pelo menos 5 dores para desbloquear o motor de temas.',
    nudgeMessage: 'Dores bem mapeadas transformam temas genéricos em conteúdo que converte.',
  },
  {
    id: 5,
    key: 'solutions',
    title: 'Padrões de Solução',
    optional: false,
    suggestion: 'Conecte cada solução a uma dor — isso cria ângulos de conteúdo poderosos.',
    nudgeMessage: 'Padrões de solução são a assinatura do seu método. Eles diferenciam seu conteúdo.',
  },
  {
    id: 6,
    key: 'objections',
    title: 'Objeções Comuns',
    optional: true,
    suggestion: 'Opcional, mas recomendado — objeções viram pautas de conteúdo de alta conversão.',
    nudgeMessage: 'Antecipar objeções no conteúdo reduz o ciclo de vendas.',
  },
  {
    id: 7,
    key: 'activation',
    title: 'Ativação',
    optional: false,
    suggestion: 'Com 5 cases e 5 dores cadastrados, o motor estará pronto para gerar temas.',
    nudgeMessage: 'Após ativar, o Inbound Forge analisará sua base e gerará os primeiros temas automaticamente.',
  },
] as const
