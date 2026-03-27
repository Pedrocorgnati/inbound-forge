/**
 * POST /api/sources/:id/test
 * TASK-4 ST003 / module-6-scraping-worker
 *
 * Testa acessibilidade de uma fonte sem persistir dados.
 * Retorna preview do texto extraído via fetch simples (primeiros 500 chars).
 * Extração completa via Playwright ocorre somente no worker.
 * SEC-008: preview truncado — rawText nunca persistido nesta rota.
 * AUTH_001: JWT obrigatório.
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireSession, notFound, internalError } from '@/lib/api-auth'
import { findSourceById } from '@/lib/services/source.service'
import { isBlockedDomain } from '@/lib/constants/blocked-domains'

const FETCH_TIMEOUT_MS = 15_000
const PREVIEW_LENGTH = 500

type Params = { params: Promise<{ id: string }> }

function extractTextFromHtml(html: string): string {
  // Remove tags e normaliza espaços para preview rápido
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export async function POST(_request: NextRequest, { params }: Params) {
  const { user, response: authError } = await requireSession()
  if (authError) return authError

  const { id } = await params

  const source = await findSourceById(id, user!.id)
  if (!source) return notFound()

  // Dupla verificação de domínio bloqueado (INT-136)
  if (isBlockedDomain(source.url)) {
    return NextResponse.json(
      { success: false, code: 'SRC_002', error: 'Domínio bloqueado (INT-136).' },
      { status: 422 }
    )
  }

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

    let html: string
    let title = ''
    let status: number

    try {
      const response = await fetch(source.url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'InboundForge-Crawler/1.0 (B2B lead research)' },
      })
      status = response.status

      if (!response.ok) {
        return NextResponse.json(
          {
            success: false,
            code: 'SRC_003',
            error: `URL retornou status ${status}. Verifique se a URL está acessível.`,
          },
          { status: 422 }
        )
      }

      html = await response.text()
    } finally {
      clearTimeout(timer)
    }

    // Extrair título
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i)
    if (titleMatch?.[1]) {
      title = titleMatch[1].trim()
    }

    const rawText = extractTextFromHtml(html)
    const charCount = rawText.length
    // SEC-008: apenas preview — nunca retornar rawText completo
    const preview = rawText.slice(0, PREVIEW_LENGTH)

    return NextResponse.json({
      success: true,
      data: {
        title,
        charCount,
        preview,
        note: 'Extração completa via Playwright ocorre no worker durante o scraping real.',
        extractedAt: new Date().toISOString(),
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown'
    console.error('[Sources/Test] Extraction failed', { sourceId: id, error: message })

    if (message.includes('abort') || message.includes('AbortError')) {
      return NextResponse.json(
        { success: false, code: 'SYS_002', error: 'Timeout ao acessar a URL. Tente novamente.' },
        { status: 503 }
      )
    }

    if (message.includes('ENOTFOUND') || message.includes('ECONNREFUSED')) {
      return NextResponse.json(
        { success: false, code: 'SRC_003', error: 'URL inacessível ou domínio inválido.' },
        { status: 422 }
      )
    }

    return internalError()
  }
}
