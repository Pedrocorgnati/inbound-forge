/**
 * Geração de 3 ângulos de conteúdo via Claude API.
 *
 * IMPORTANTE: O vocabulário desta camada (AGGRESSIVE/CONSULTIVE/AUTHORIAL)
 * difere do enum Prisma e do BUDGET. Veja a tabela canônica em:
 * docs/ANGLE-MAPPING.md (output/docs/inbound-forge/project/ANGLE-MAPPING.md)
 *
 * Módulo: module-8-content-generation (TASK-1/ST002)
 * Framework E-E-A-T para geração de 3 ângulos de conteúdo:
 * AGGRESSIVE (amplifica dor), CONSULTIVE (educa), AUTHORIAL (case/prova social)
 */
import type { Channel, ContentAngle, FunnelStage } from '@prisma/client'
import type { KnowledgeContext } from '@/lib/types/content-generation.types'
import { CHANNEL_CHAR_LIMITS } from '@/lib/constants/content.constants'

export function buildAngleGenerationPrompt(
  context: KnowledgeContext,
  funnelStage: FunnelStage,
  targetChannel: Channel,
  feedbackHints: string[] = []
): string {
  const charLimit = CHANNEL_CHAR_LIMITS[targetChannel]
  const charLimitText = charLimit === Infinity ? 'sem limite (mínimo 800 palavras para SEO)' : `até ${charLimit} caracteres`

  const painsSection = context.pains.length > 0
    ? context.pains.map(p => `- ${p.title}: ${p.description}`).join('\n')
    : '(Nenhuma dor mapeada para este tema)'

  const casesSection = context.cases.length > 0
    ? context.cases.map(c => `- ${c.title}: ${c.result}`).join('\n')
    : '(Nenhum case mapeado para este tema)'

  const patternsSection = context.patterns.length > 0
    ? context.patterns.map(p => `- ${p.title}: ${p.description}`).join('\n')
    : '(Nenhum padrão de solução mapeado)'

  const feedbackSection = feedbackHints.length > 0
    ? `\nFEEDBACK DE GERAÇÕES ANTERIORES (incorpore estas melhorias):\n${feedbackHints.map(h => `- ${h}`).join('\n')}`
    : ''

  return `Você é um especialista em marketing B2B e copywriting para desenvolvedores freelancers que criam software sob medida para PMEs brasileiras.

CONTEXTO DO TEMA:
Título: ${context.theme.title}

KNOWLEDGE BASE:
Dores relacionadas:
${painsSection}

Cases de sucesso:
${casesSection}

Padrões de solução:
${patternsSection}${feedbackSection}

CANAL ALVO: ${targetChannel}
LIMITE DE CARACTERES: ${charLimitText}
ESTÁGIO DO FUNIL: ${funnelStage}

FRAMEWORK E-E-A-T:
- Experience (Experiência): use os cases reais como prova
- Expertise (Expertise): demonstre domínio técnico do problema
- Authoritativeness (Autoridade): referências implícitas a resultados
- Trustworthiness (Confiança): dados quantificáveis dos cases

TAREFA:
Gere EXATAMENTE 3 variações de conteúdo com ângulos diferentes:

1. AGGRESSIVE: amplifica a dor, cria urgência, apresenta o caminho de saída sem rodeios
2. CONSULTIVE: educa sobre o problema com profundidade, demonstra expertise técnica (sem vender diretamente)
3. AUTHORIAL: conta o resultado de um case de forma envolvente com prova social

RETORNE APENAS UM ARRAY JSON VÁLIDO com EXATAMENTE 3 objetos, sem texto adicional:
[
  {
    "angle": "AGGRESSIVE",
    "body": "texto completo do conteúdo (${charLimitText})",
    "charCount": 0,
    "ctaText": "chamada para ação (max 150 chars)",
    "ctaDestination": "WHATSAPP",
    "hashtags": ["hashtag1", "hashtag2"]
  },
  {
    "angle": "CONSULTIVE",
    "body": "texto completo...",
    "charCount": 0,
    "ctaText": "chamada para ação...",
    "ctaDestination": "WHATSAPP",
    "hashtags": ["hashtag1", "hashtag2"]
  },
  {
    "angle": "AUTHORIAL",
    "body": "texto completo...",
    "charCount": 0,
    "ctaText": "chamada para ação...",
    "ctaDestination": "WHATSAPP",
    "hashtags": ["hashtag1", "hashtag2"]
  }
]

IDIOMA: português brasileiro
IMPORTANTE: Retorne APENAS o JSON, sem \`\`\`json ou qualquer outro texto fora do array.`
}

// Map de nomes dos ângulos da API para o enum Prisma
export const ANGLE_NAME_MAP: Record<string, ContentAngle> = {
  AGGRESSIVE: 'AGGRESSIVE',
  CONSULTIVE: 'CONSULTIVE',
  AUTHORIAL: 'AUTHORIAL',
}
