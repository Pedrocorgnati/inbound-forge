/**
 * Tests: Playwright Crawler
 * TASK-1 ST003 / module-6-scraping-worker
 * Cobertura: SUCCESS, ERROR, EDGE, DEGRADED
 *
 * Playwright é mockado: os testes validam lógica de retry,
 * timeout, seletor fallback e fail-safe sem lançar Chromium real.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock playwright antes de importar o crawler
vi.mock('playwright', () => {
  const mockInnerText = vi.fn()
  const mockTitle = vi.fn()
  const mockGoto = vi.fn()
  const mockDollar = vi.fn()
  const mockSetDefaultTimeout = vi.fn()

  const page = {
    goto: mockGoto,
    title: mockTitle,
    innerText: mockInnerText,
    $: mockDollar,
    setDefaultTimeout: mockSetDefaultTimeout,
  }

  const browser = {
    newPage: vi.fn().mockResolvedValue(page),
    close: vi.fn().mockResolvedValue(undefined),
  }

  return {
    chromium: {
      launch: vi.fn().mockResolvedValue(browser),
    },
    _page: page,
    _browser: browser,
  }
})

import { crawlUrl } from '../crawler'
import * as playwright from 'playwright'

// Helpers para acessar mocks internos
function getPageMocks() {
  const mod = playwright as unknown as {
    _page: {
      goto: ReturnType<typeof vi.fn>
      title: ReturnType<typeof vi.fn>
      innerText: ReturnType<typeof vi.fn>
      $: ReturnType<typeof vi.fn>
      setDefaultTimeout: ReturnType<typeof vi.fn>
    }
  }
  return mod._page
}

function getChromiumLaunch() {
  return (playwright.chromium.launch as ReturnType<typeof vi.fn>)
}

beforeEach(() => {
  vi.clearAllMocks()
  const page = getPageMocks()
  page.setDefaultTimeout.mockImplementation(() => {})
  page.goto.mockResolvedValue(undefined)
  page.title.mockResolvedValue('Página de Teste')
  page.innerText.mockResolvedValue('Conteúdo extraído da página')
  page.$.mockResolvedValue(null)
})

describe('crawlUrl', () => {
  // [SUCCESS] extração básica sem seletor
  it('retorna título e rawText para URL válida sem seletor', async () => {
    const page = getPageMocks()
    page.innerText.mockResolvedValue('Texto do corpo da página')

    const result = await crawlUrl('https://example.com')

    expect(result.url).toBe('https://example.com')
    expect(result.title).toBe('Página de Teste')
    expect(result.rawText).toBe('Texto do corpo da página')
    expect(result.extractedAt).toBeTruthy()
  })

  // [SUCCESS] extração com seletor válido que tem match
  it('usa seletor CSS quando o elemento existe na página', async () => {
    const page = getPageMocks()
    const mockElement = { innerText: vi.fn().mockResolvedValue('Conteúdo do seletor') }
    page.$.mockResolvedValue(mockElement)

    const result = await crawlUrl('https://example.com', '.main-content')

    expect(result.rawText).toBe('Conteúdo do seletor')
    expect(page.$).toHaveBeenCalledWith('.main-content')
  })

  // [EDGE] seletor sem match — fallback para body
  it('usa body como fallback quando seletor não encontra elemento', async () => {
    const page = getPageMocks()
    page.$.mockResolvedValue(null) // seletor sem match
    page.innerText.mockResolvedValue('Conteúdo do body (fallback)')

    const result = await crawlUrl('https://example.com', '.nao-existe')

    expect(result.rawText).toBe('Conteúdo do body (fallback)')
  })

  // [EDGE] seletor CSS inválido — fallback para body sem lançar erro
  it('usa body como fallback para seletor CSS inválido', async () => {
    const page = getPageMocks()
    page.$.mockRejectedValue(new Error('Invalid selector'))
    page.innerText.mockResolvedValue('Conteúdo do body (fallback CSS inválido)')

    const result = await crawlUrl('https://example.com', '[[inválido]]')

    expect(result.rawText).toBe('Conteúdo do body (fallback CSS inválido)')
  })

  // [DEGRADED] site bloqueado — não retenta, retorna rawText vazio
  it('não retenta e retorna rawText vazio quando site bloqueia (403)', async () => {
    const launch = getChromiumLaunch()
    launch.mockRejectedValue(new Error('Request failed with status 403'))

    const result = await crawlUrl('https://blocked.example.com')

    expect(result.rawText).toBe('')
    expect(result.title).toBeNull()
    // Lança apenas 1 vez (sem retry após bloqueio)
    expect(launch).toHaveBeenCalledTimes(1)
  })

  // [DEGRADED] Cloudflare detectado — não retenta
  it('não retenta quando Cloudflare é detectado na mensagem de erro', async () => {
    const launch = getChromiumLaunch()
    launch.mockRejectedValue(new Error('Cloudflare challenge detected'))

    const result = await crawlUrl('https://protected.example.com')

    expect(result.rawText).toBe('')
    expect(launch).toHaveBeenCalledTimes(1)
  })

  // [ERROR] timeout após todas as tentativas — retorna rawText vazio
  it('retorna rawText vazio após esgotar todas as tentativas com timeout', async () => {
    const launch = getChromiumLaunch()
    launch.mockRejectedValue(new Error('Timeout exceeded'))

    const result = await crawlUrl('https://slow.example.com')

    expect(result.rawText).toBe('')
    expect(result.title).toBeNull()
    expect(result.url).toBe('https://slow.example.com')
    expect(result.extractedAt).toBeTruthy()
  })

  // [SUCCESS] extractedAt é ISO 8601
  it('retorna extractedAt como string ISO 8601 válida', async () => {
    const result = await crawlUrl('https://example.com')

    expect(() => new Date(result.extractedAt)).not.toThrow()
    expect(new Date(result.extractedAt).toISOString()).toBe(result.extractedAt)
  })
})
