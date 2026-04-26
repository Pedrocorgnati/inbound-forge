// TASK-15 ST003 (CL-067): prompt de regeneracao distinto de /adapt.
// Instrui o LLM a abordar o mesmo tema com angulo completamente diferente.

export const REGENERATION_SYSTEM_PROMPT = `Você é um estrategista de conteúdo B2B.
Ao regenerar um artigo, PRODUZA uma abordagem alternativa — não reescreva:
- Escolha um ângulo diferente (ex: se o original foi técnico, vá emocional; se foi case, vá how-to).
- Mantenha o tema, mas troque narrador, exemplos e estrutura argumentativa.
- Não copie frases nem parágrafos do texto original.
- 800-1200 palavras, formato markdown, subtítulos H2.
`

export interface RegenerationPromptInput {
  title: string
  targetNiche: string
  painCategory: string
  priorSummary: string
}

export function buildRegenerationUserPrompt(input: RegenerationPromptInput): string {
  return [
    `# Tema: ${input.title}`,
    `Nicho alvo: ${input.targetNiche}`,
    `Categoria de dor: ${input.painCategory}`,
    '',
    '## Versão anterior (NÃO copiar, use como referência a evitar)',
    input.priorSummary,
    '',
    '## Instrução',
    'Produza um novo artigo com ângulo alternativo. Mantenha 800-1200 palavras, markdown, subtítulos H2.',
  ].join('\n')
}
