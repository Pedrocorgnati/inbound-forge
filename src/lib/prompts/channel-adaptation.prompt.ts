/**
 * Prompts de Adaptação por Canal — Inbound Forge
 * Módulo: module-8-content-generation (TASK-4/ST001)
 */
import type { Channel, FunnelStage } from '@prisma/client'
import { CHANNEL_CHAR_LIMITS } from '@/lib/constants/content.constants'

const CHANNEL_TONE_GUIDES: Record<Channel, string> = {
  LINKEDIN: `
Tom: profissional, direto, orientado a resultados B2B
Estrutura: gancho (1-2 linhas) + desenvolvimento (parágrafos curtos, máx 3 linhas) + CTA
Evitar: emojis excessivos, linguagem informal, mais de 5 hashtags
CTA B2B: "Me chame no WhatsApp para conversar" / "Leia o artigo completo"
Parágrafos: espaçados, facilitam leitura no feed LinkedIn`,

  INSTAGRAM: `
Tom: visual, storytelling, mais casual e pessoal, envolvente
Estrutura: gancho forte (1 linha) + história + CTA + hashtags ao final
Emojis: usar estrategicamente (3-5 por post)
CTA: "Link na bio" / "Me manda DM" / "Salva esse post"
Hashtags: 15-20 hashtags relevantes ao final do post`,

  BLOG: `
Tom: educativo, aprofundado, SEO-friendly
Estrutura: H1 (palavra-chave no título) + introdução + desenvolvimento com H2/H3 + conclusão + CTA
SEO: incluir palavra-chave nos primeiros 100 chars
CTA: link para WhatsApp ou formulário de contato
Comprimento: mínimo 800 palavras para SEO — use Markdown com # ## ###
Hashtags: NÃO incluir hashtags em artigos de blog`,

  // post-MVP CL-064
  TIKTOK: `
Tom: dinâmico, rápido, entretenimento com valor
Estrutura: gancho (primeiros 3s) + desenvolvimento ágil + CTA
Emojis: uso frequente, linguagem jovem e direta
CTA: "Segue para mais dicas" / "Comenta X se você já passou por isso"
Hashtags: 5-10 hashtags de nicho`,

  // post-MVP CL-065
  YOUTUBE_SHORTS: `
Tom: educativo e direto, voltado para conversão
Estrutura: pergunta/gancho + resposta rápida + CTA para conteúdo longo
Emojis: moderado
CTA: "Assiste o vídeo completo no canal" / "Inscreve-se para mais"
Hashtags: 3-5 hashtags relevantes`,
}

const FUNNEL_STAGE_ADJUSTMENTS: Record<FunnelStage, string> = {
  AWARENESS: 'Foco em educar sobre o problema e despertar consciência — não vender diretamente',
  CONSIDERATION: 'Comparar abordagens e mostrar diferenciação — o leitor já sabe do problema',
  DECISION: 'Prova social direta com urgência leve e CTA forte — o leitor está pronto para agir',
}

export function buildChannelAdaptationPrompt(
  originalBody: string,
  targetChannel: Channel,
  funnelStage: FunnelStage,
  ctaDestination: string,
  ctaCustomText?: string
): string {
  const charLimit = CHANNEL_CHAR_LIMITS[targetChannel]
  const charLimitText = charLimit === Infinity
    ? 'sem limite máximo (mínimo 800 palavras)'
    : `máximo ${charLimit} caracteres`

  const ctaSection = ctaCustomText
    ? `CTA personalizado: "${ctaCustomText}"`
    : `Destino do CTA: ${ctaDestination}`

  return `Você é um especialista em copywriting e marketing de conteúdo para B2B brasileiro.

CONTEÚDO ORIGINAL:
${originalBody}

CANAL ALVO: ${targetChannel}
LIMITE DE CARACTERES: ${charLimitText}
ESTÁGIO DO FUNIL: ${funnelStage} — ${FUNNEL_STAGE_ADJUSTMENTS[funnelStage]}
${ctaSection}

GUIA DE TOM PARA ${targetChannel}:
${CHANNEL_TONE_GUIDES[targetChannel]}

TAREFA:
Adapte o conteúdo original para o canal ${targetChannel} seguindo RIGOROSAMENTE o guia de tom acima.

RETORNE APENAS UM OBJETO JSON VÁLIDO, sem texto adicional:
{
  "adaptedBody": "texto adaptado completo",
  "hashtags": ["hashtag1", "hashtag2"],
  "charCount": 0
}

IMPORTANTE:
- Respeite o limite de ${charLimitText}
- NÃO adicione explicações fora do JSON
- charCount deve ser o comprimento real de adaptedBody
- Idioma: português brasileiro`
}
