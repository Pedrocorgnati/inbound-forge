/**
 * Claude Classifier — Scraping Worker
 * TASK-2 ST001 + ST004 / module-6-scraping-worker
 *
 * Classifica textos raspados usando Claude API com 5 perguntas.
 * SEC-008: NUNCA logar text/rawText — apenas IDs e resultado.
 * COMP-001: ApiUsageLog após cada chamada.
 * ST004: verificação anti-PII no reasoning antes de persistir.
 */
import Anthropic from '@anthropic-ai/sdk'
import {
  buildClassificationPrompt,
  CLAUDE_MODEL,
  CLAUDE_MAX_TOKENS,
  COST_PER_INPUT_TOKEN,
  COST_PER_OUTPUT_TOKEN,
} from './classifier.prompt'
import { getPrisma } from './db'

export interface ClassificationResult {
  isPainCandidate: boolean
  scores: {
    isOperationalPain: string
    isSolvableWithSoftware: string
    involvesIntegration: string
    companySize: string
    isRecurrent: string
  }
  reasoning: string
  suggestedCategory: string | null
}

const FALLBACK_RESULT: ClassificationResult = {
  isPainCandidate: false,
  scores: {
    isOperationalPain: 'incerto',
    isSolvableWithSoftware: 'incerto',
    involvesIntegration: 'incerto',
    companySize: 'nao_identificado',
    isRecurrent: 'nao_identificado',
  },
  reasoning: 'Erro de classificação — resultado indisponível',
  suggestedCategory: null,
}

let _client: Anthropic | undefined

function getClient(): Anthropic {
  if (!_client) {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new Error('SYS_004: ANTHROPIC_API_KEY não configurada')
    }
    _client = new Anthropic({ apiKey })
  }
  return _client
}

// SEC-008: verificação anti-PII simples (espelhada de src/lib/utils/pii-check.ts para uso standalone)
const PII_PATTERNS = [
  /\d{3}\.\d{3}\.\d{3}-\d{2}/,       // CPF
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/, // email
  /\(\d{2}\)\s?\d{4,5}-?\d{4}/,       // telefone BR
  /\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/, // CNPJ
]

function sanitizeReasoning(reasoning: string | null | undefined): string | null {
  if (!reasoning) return reasoning ?? null
  try {
    const hasPii = PII_PATTERNS.some((p) => p.test(reasoning))
    return hasPii ? '[REDACTED - PII detectado]' : reasoning
  } catch {
    return '[REDACTED - verificação falhou]'
  }
}

async function logApiUsage(inputTokens: number, outputTokens: number): Promise<void> {
  const prisma = getPrisma()
  const totalTokens = inputTokens + outputTokens
  const cost = inputTokens * COST_PER_INPUT_TOKEN + outputTokens * COST_PER_OUTPUT_TOKEN

  try {
    await prisma.apiUsageLog.create({
      data: {
        service: 'claude',
        metric: 'tokens',
        value: totalTokens,
        cost,
      },
    })
  } catch (err) {
    console.error('[Classifier] Failed to log API usage', err instanceof Error ? err.message : 'unknown')
  }
}

/**
 * Classifica um ScrapedText pelo seu ID.
 * Atualiza classificationResult, isPainCandidate e isProcessed no DB.
 * SEC-008: nunca loga o conteúdo do texto.
 */
export async function classifyText(
  scrapedTextId: string,
  text: string
): Promise<ClassificationResult> {
  const prisma = getPrisma()

  // DEGRADED: sem API key — falha imediata
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    await prisma.alertLog.create({
      data: {
        type: 'CLAUDE_AUTH_FAILURE',
        severity: 'CRITICAL',
        message: 'ANTHROPIC_API_KEY ausente — classificação impossível (SYS_004)',
        resolved: false,
      },
    }).catch(() => {})

    await markFallback(prisma, scrapedTextId, FALLBACK_RESULT)
    return FALLBACK_RESULT
  }

  const client = getClient()
  const prompt = buildClassificationPrompt(text)
  let lastError: unknown

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await client.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: CLAUDE_MAX_TOKENS,
        messages: [{ role: 'user', content: prompt }],
      })

      const usage = response.usage
      await logApiUsage(usage.input_tokens, usage.output_tokens)

      const rawContent = response.content[0]
      if (rawContent.type !== 'text') {
        throw new Error('Unexpected response type from Claude API')
      }

      let result: ClassificationResult
      try {
        result = JSON.parse(rawContent.text) as ClassificationResult
      } catch {
        // EDGE: resposta não é JSON válido
        result = {
          ...FALLBACK_RESULT,
          reasoning: 'Erro de parse — classificação não disponível',
        }
      }

      // ST004: anti-PII no reasoning
      result.reasoning = sanitizeReasoning(result.reasoning) ?? FALLBACK_RESULT.reasoning

      // Forçar lógica isPainCandidate
      result.isPainCandidate =
        result.scores.isOperationalPain === 'sim' &&
        result.scores.isSolvableWithSoftware === 'sim'

      await prisma.scrapedText.update({
        where: { id: scrapedTextId },
        data: {
          classificationResult: result as object,
          isPainCandidate: result.isPainCandidate,
          isProcessed: true,
        },
      })

      // SEC-008: log apenas ID e resultado — sem texto
      console.info(
        `[Classifier] Classified | id=${scrapedTextId} | isPainCandidate=${result.isPainCandidate}`
      )

      return result
    } catch (err) {
      lastError = err

      const isAuthError =
        err instanceof Error && (err.message.includes('401') || err.message.includes('auth'))

      if (isAuthError) {
        // DEGRADED: chave revogada — não retentar
        await prisma.alertLog.create({
          data: {
            type: 'CLAUDE_AUTH_FAILURE',
            severity: 'CRITICAL',
            message: 'ANTHROPIC_API_KEY inválida ou revogada — todos os itens do batch receberão fallback',
            resolved: false,
          },
        }).catch(() => {})
        break
      }

      if (attempt < 3) {
        const delay = attempt * 1000
        await new Promise((r) => setTimeout(r, delay))
      }
    }
  }

  // ERROR: 3 tentativas falharam
  await prisma.alertLog.create({
    data: {
      type: 'CLAUDE_API_ERROR',
      severity: 'HIGH',
      message: `Falha na classificação após 3 tentativas | scrapedTextId=${scrapedTextId}`,
      resolved: false,
    },
  }).catch(() => {})

  await markFallback(prisma, scrapedTextId, FALLBACK_RESULT)
  console.error(`[Classifier] Failed after 3 attempts | id=${scrapedTextId}`)
  return FALLBACK_RESULT
}

async function markFallback(
  prisma: Awaited<ReturnType<typeof getPrisma>>,
  scrapedTextId: string,
  result: ClassificationResult
): Promise<void> {
  await prisma.scrapedText.update({
    where: { id: scrapedTextId },
    data: {
      classificationResult: result as object,
      isPainCandidate: false,
      isProcessed: true,
    },
  }).catch((err: unknown) => {
    console.error(`[Classifier] Failed to mark fallback | id=${scrapedTextId}`, err instanceof Error ? err.message : 'unknown')
  })
}
