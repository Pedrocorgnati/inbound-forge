// Blog Generation Prompts — GEO Architecture
// Rastreabilidade: CL-107, CL-108, TASK-6 ST001
// Intake Review TASK-5 ST004 (CL-164): enforcement explicito summary-first —
// os primeiros 2 paragrafos DEVEM responder integralmente a pergunta principal
// do titulo. Validacao pos-geracao em `summary-first-validator`.
// GEO = Generative Engine Optimization: content structured for AI-powered search results

/**
 * Instrucoes GEO obrigatorias para todos os artigos do blog.
 * Incluir em qualquer prompt de geracao de artigo.
 */
export const GEO_SYSTEM_INSTRUCTIONS = `
Você é um especialista em content marketing B2B seguindo a arquitetura GEO (Generative Engine Optimization).

REGRAS OBRIGATÓRIAS DE ESTRUTURA:

1. SUMMARY-FIRST (Resposta Direta):
   - Comece SEMPRE com 2-3 frases que respondem diretamente à pergunta principal do título.
   - Não use introduções genéricas como "Neste artigo vamos explorar..." ou "Você já se perguntou...".
   - O leitor deve obter o valor central do artigo nos primeiros 2 parágrafos.
   - Exemplo correto: "Inbound marketing B2B reduz o ciclo de vendas em 30-50% ao atrair leads já qualificados. As 3 táticas mais eficazes são: [lista]."

2. HEADINGS INTERROGATIVOS (H2/H3):
   - Use headings H2 em formato de pergunta sempre que possível.
   - Correto: "Como o inbound marketing reduz o custo de aquisição?"
   - Evitar: "Redução do custo de aquisição"
   - H3 pode ser afirmativo quando listar itens sequenciais (passo 1, passo 2...).

3. ESTRUTURA DO ARTIGO:
   - Parágrafo 1-2: resposta direta (summary-first)
   - H2 interrogativo: contexto/problema
   - H2 interrogativo: solução detalhada
   - H2: exemplos/cases concretos
   - H2: perguntas frequentes (FAQ formato pergunta-resposta)
   - Conclusão com CTA claro

4. LINGUAGEM:
   - Específico e direto. Evitar generalismos.
   - Dados e percentuais sempre que possível.
   - Tom conversacional mas profissional.

5. EXCERPT/META DESCRIPTION:
   - Deve responder em 1 frase: "O que o leitor aprende neste artigo?"
   - Máximo 160 caracteres.
   - Sem frases de boas-vindas.
` as const

/**
 * Template de prompt para geração de artigo de blog.
 * Substituir placeholders antes de enviar à API.
 */
export function buildBlogArticlePrompt(params: {
  title: string
  keywords: string[]
  targetAudience: string
  tone?: string
  wordCount?: number
  locale?: string
}): string {
  const {
    title,
    keywords,
    targetAudience,
    tone = 'profissional e direto',
    wordCount = 1200,
    locale = 'pt-BR',
  } = params

  return `${GEO_SYSTEM_INSTRUCTIONS}

ARTIGO A GERAR:
- Título: "${title}"
- Palavras-chave: ${keywords.join(', ')}
- Público-alvo: ${targetAudience}
- Tom: ${tone}
- Extensão aproximada: ${wordCount} palavras
- Idioma: ${locale}

Gere o artigo completo em Markdown seguindo as regras GEO acima.
Inclua ao final uma seção "## Perguntas Frequentes" com 3-4 perguntas relevantes em formato Q&A.
`.trim()
}

/**
 * Instrucao adicional para headings interrogativos — pode ser injetada em prompts existentes.
 */
export const HEADING_INTERROGATIVE_INSTRUCTION = `
Use headings H2 em formato de pergunta (ex: "Como funciona X?", "Por que Y importa?", "Quando usar Z?").
Isso melhora a captação por mecanismos de busca baseados em IA (GEO).
` as const
