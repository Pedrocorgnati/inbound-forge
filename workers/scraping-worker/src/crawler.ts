/**
 * Playwright Crawler — Scraping Worker
 * TASK-1 ST003 / module-6-scraping-worker
 *
 * Extrai título e texto de uma URL via Playwright/Chromium headless.
 * SEC-008: NUNCA logar rawText — apenas url, timestamp e erros técnicos.
 * COMP-006: rawText é temporário — descartado após pipeline LGPD (TASK-3).
 */
import type { Browser, Page } from 'playwright'
import { PAGE_TIMEOUT_MS, CRAWLER_MAX_RETRIES } from './constants'
import { getBrowser, getBrowserMode } from './browserless-client'

export interface CrawlResult {
  url: string
  title: string | null
  rawText: string
  extractedAt: string
}

async function extractFromPage(page: Page, url: string, selector?: string | null): Promise<CrawlResult> {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: PAGE_TIMEOUT_MS })

  const title = await page.title().catch(() => null)

  let rawText = ''

  if (selector) {
    try {
      const element = await page.$(selector)
      if (element) {
        rawText = await element.innerText()
      } else {
        // Seletor válido mas sem match — fallback para body
        console.info(`[Crawler] Selector no match, fallback body | url=${url}`)
        rawText = await page.innerText('body')
      }
    } catch (err) {
      // EDGE: seletor CSS inválido — fallback para body
      const selectorPreview = selector.slice(0, 40)
      console.info(`[Crawler] Selector fallback: invalid selector "${selectorPreview}", using body | url=${url}`)
      rawText = await page.innerText('body').catch(() => '')
    }
  } else {
    rawText = await page.innerText('body').catch(() => '')
  }

  return { url, title, rawText: rawText.trim(), extractedAt: new Date().toISOString() }
}

/**
 * Extrai conteúdo de uma URL com retry 2x e timeout de 30s por página.
 * Retorna rawText vazio em caso de falha total — não trava o pipeline.
 */
export async function crawlUrl(url: string, selector?: string | null): Promise<CrawlResult> {
  let browser: Browser | null = null
  let lastError: unknown

  for (let attempt = 1; attempt <= CRAWLER_MAX_RETRIES + 1; attempt++) {
    try {
      // TASK-11 ST002: conecta via Browserless remoto quando BROWSERLESS_WS_URL
      // estiver setada; fallback automatico para chromium.launch local.
      browser = await getBrowser()

      const page = await browser.newPage()
      page.setDefaultTimeout(PAGE_TIMEOUT_MS)

      const result = await extractFromPage(page, url, selector)

      await browser.close()
      browser = null

      // SEC-008: log apenas url e extractedAt — NUNCA rawText
      console.info(`[Crawler] Extracted | url=${url} | mode=${getBrowserMode()} | chars=${result.rawText.length} | at=${result.extractedAt}`)

      return result
    } catch (err) {
      lastError = err
      if (browser) {
        await browser.close().catch(() => {})
        browser = null
      }

      const isBlocked = err instanceof Error && (
        err.message.includes('403') ||
        err.message.includes('captcha') ||
        err.message.includes('Cloudflare')
      )

      if (isBlocked) {
        // DEGRADED: site bloqueou Playwright — não retentar
        console.warn(`[Crawler] Site blocked Playwright for url=${url}`)
        break
      }

      if (attempt <= CRAWLER_MAX_RETRIES) {
        const delay = attempt * 1000  // 1s, 2s
        console.warn(`[Crawler] Retry ${attempt}/${CRAWLER_MAX_RETRIES} | url=${url} | delay=${delay}ms`)
        await new Promise((r) => setTimeout(r, delay))
      }
    } finally {
      if (browser) {
        await browser.close().catch(() => {})
        browser = null
      }
    }
  }

  // Fallback: retornar rawText vazio — não travar o pipeline (DEGRADED / ERROR)
  console.error(
    `[Crawler] Failed after ${CRAWLER_MAX_RETRIES + 1} attempts | url=${url}`,
    lastError instanceof Error ? lastError.message : 'unknown'
  )
  return { url, title: null, rawText: '', extractedAt: new Date().toISOString() }
}
