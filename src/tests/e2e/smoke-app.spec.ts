/**
 * Smoke E2E: garante que, autenticado, as páginas principais do painel
 * carregam sem erro de servidor (5xx), sem 404 de APIs e sem crash de runtime
 * no cliente. Complementa os fluxos de negócio (flow-*.test.ts) com uma
 * verificação ampla e barata de saúde end-to-end.
 */
import { test, expect, type Page } from '@playwright/test'
import { loginAsOperator, loginViaApi } from './helpers/auth'

// Páginas protegidas centrais do painel.
const PROTECTED_PAGES = [
  '/pt-BR/dashboard',
  '/pt-BR/content',
  '/pt-BR/themes',
  '/pt-BR/leads',
  '/pt-BR/knowledge',
  '/pt-BR/sources',
  '/pt-BR/analytics',
  '/pt-BR/calendar',
  '/pt-BR/forms',
  '/pt-BR/fila',
  '/pt-BR/settings',
  '/pt-BR/health',
]

/** Coleta erros de runtime do cliente e respostas HTTP com falha. */
function attachCollectors(page: Page) {
  const pageErrors: string[] = []
  const httpFailures: string[] = []
  page.on('pageerror', (e) => pageErrors.push(e.message.split('\n')[0]))
  page.on('response', (r) => {
    const s = r.status()
    // Ignora 401/403 esperados em recursos opcionais; falhamos em 404 de API e 5xx.
    if (s >= 500 || (s === 404 && r.url().includes('/api/'))) {
      httpFailures.push(`${s} ${r.url().replace(/\?.*/, '')}`)
    }
  })
  return { pageErrors, httpFailures }
}

test.describe('Smoke: painel autenticado', () => {
  // Em dev o Next compila cada rota sob demanda no primeiro acesso, o que pode
  // levar dezenas de segundos. Timeout generoso evita falsos negativos.
  test.describe.configure({ timeout: 90_000 })

  // Valida o fluxo de login REAL via UI (form → dashboard).
  test('login via UI leva ao dashboard sem crash', async ({ page }) => {
    const { pageErrors } = attachCollectors(page)
    // loginAsOperator já valida o redirect para /dashboard (login pela UI funciona).
    await loginAsOperator(page)
    // Deixa os fetches/render do dashboard rodarem e garante ausência de crash.
    await page.waitForTimeout(3000)
    await expect(page).toHaveURL(/\/dashboard/)
    expect(pageErrors, `Erros de runtime: ${pageErrors.join(' | ')}`).toEqual([])
  })

  // Health amplo das páginas usando auth programático (rápido e determinístico).
  for (const path of PROTECTED_PAGES) {
    test(`página ${path} carrega sem erro de servidor`, async ({ page, context }) => {
      await loginViaApi(context)
      const { pageErrors, httpFailures } = attachCollectors(page)

      await page.goto(path, { waitUntil: 'domcontentloaded' })
      // Dá tempo dos fetches do cliente dispararem.
      await page.waitForTimeout(2500)

      expect(httpFailures, `${path} -> falhas HTTP: ${httpFailures.join(' | ')}`).toEqual([])
      expect(pageErrors, `${path} -> erros runtime: ${pageErrors.join(' | ')}`).toEqual([])
      // A navegação não deve ter sido expulsa para o login.
      await expect(page).not.toHaveURL(/\/login/)
    })
  }
})
