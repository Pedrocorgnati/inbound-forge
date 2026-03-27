/**
 * Classification Prompt — Scraping Worker
 * TASK-2 ST001 / module-6-scraping-worker
 *
 * Prompt de 5 perguntas para qualificação de dores operacionais.
 * SEC-008: {text} substituído em runtime — NUNCA logar o prompt com texto real.
 */

export const CLASSIFICATION_PROMPT_TEMPLATE = `
Você é um especialista em identificar dores operacionais de empresas que podem ser resolvidas com software personalizado desenvolvido por um desenvolvedor freelancer.

Analise o seguinte texto e responda SOMENTE com um JSON válido seguindo o schema abaixo.

TEXTO:
{text}

PERGUNTAS DE QUALIFICAÇÃO:
1. O texto descreve uma dor operacional concreta de uma empresa? (sim/não/incerto)
2. A dor descrita pode ser resolvida com software customizado? (sim/não/incerto)
3. O problema envolve integração, automação ou gestão de dados entre sistemas? (sim/não/incerto)
4. Qual o porte da empresa que parece ter este problema? (micro/pequena/media/grande/nao_identificado)
5. A dor é recorrente/estrutural ou pontual/acidental? (recorrente/pontual/nao_identificado)

SCHEMA DE RESPOSTA:
{
  "isPainCandidate": boolean,
  "scores": {
    "isOperationalPain": "sim" | "não" | "incerto",
    "isSolvableWithSoftware": "sim" | "não" | "incerto",
    "involvesIntegration": "sim" | "não" | "incerto",
    "companySize": "micro" | "pequena" | "media" | "grande" | "nao_identificado",
    "isRecurrent": "recorrente" | "pontual" | "nao_identificado"
  },
  "reasoning": "string (max 200 chars — explicação concisa em português)",
  "suggestedCategory": "string | null (categoria de dor sugerida)"
}

REGRAS:
- isPainCandidate = true APENAS se isOperationalPain=sim E isSolvableWithSoftware=sim
- Seja conservador: na dúvida, marque isPainCandidate = false
- reasoning deve ser em português e máximo 200 caracteres
- NUNCA inclua informações pessoais identificáveis no reasoning
- Responda SOMENTE com o JSON — sem texto antes ou depois
`.trim()

export function buildClassificationPrompt(text: string): string {
  return CLASSIFICATION_PROMPT_TEMPLATE.replace('{text}', text)
}

export const CLAUDE_MODEL = 'claude-haiku-4-5-20251001'
export const CLAUDE_MAX_TOKENS = 500

// Custo estimado por 1M tokens (USD) — claude-haiku
export const COST_PER_INPUT_TOKEN = 0.25 / 1_000_000
export const COST_PER_OUTPUT_TOKEN = 1.25 / 1_000_000
