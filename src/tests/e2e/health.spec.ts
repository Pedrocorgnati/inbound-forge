/**
 * health.spec.ts — TASK-REFORGE-4 ST001
 * E2E Playwright para a página /health (module-15)
 *
 * Pré-requisito: app rodando em localhost:3000 com sessão autenticada.
 * Para CI: definir PLAYWRIGHT_BASE_URL e garantir credenciais de teste.
 */
import { test, expect } from '@playwright/test'

const LOCALE = process.env.TEST_LOCALE ?? 'pt-BR'
const HEALTH_URL = `/${LOCALE}/health`

test.describe('Página de Saúde do Sistema', () => {
  test.beforeEach(async ({ page }) => {
    // Navegar para a página — autenticação via session cookie do ambiente de teste
    await page.goto(HEALTH_URL)
  })

  test('página carrega sem erros JS no console', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    await page.goto(HEALTH_URL)
    await page.waitForLoadState('networkidle')
    // Erros críticos de JS não devem ocorrer
    const criticalErrors = errors.filter(
      (e) => !e.includes('Warning:') && !e.includes('hydrat')
    )
    expect(criticalErrors).toHaveLength(0)
  })

  test('exibe título "Saude do Sistema" na página', async ({ page }) => {
    await page.waitForSelector('[data-testid="health-page"]')
    const heading = page.locator('h1')
    await expect(heading).toContainText('Saude do Sistema')
  })

  test('exibe dashboard de saúde', async ({ page }) => {
    await page.waitForSelector('[data-testid="health-page"]')
    // O HealthDashboard renderiza um botão de refresh
    const refreshBtn = page.getByTestId('health-refresh-button')
    await expect(refreshBtn).toBeVisible()
  })

  test('botão "Atualizar" dispara refresh sem erros', async ({ page }) => {
    await page.waitForSelector('[data-testid="health-page"]')
    const refreshBtn = page.getByTestId('health-refresh-button')
    await refreshBtn.click()
    // Após click, o botão deve continuar visível (não redireciona)
    await expect(refreshBtn).toBeVisible()
  })

  test('breadcrumb exibe link para Dashboard', async ({ page }) => {
    await page.waitForSelector('[data-testid="health-header"]')
    const dashboardLink = page.locator('nav[aria-label="Breadcrumb"] a')
    await expect(dashboardLink).toContainText('Dashboard')
    await expect(dashboardLink).toHaveAttribute('href', `/${LOCALE}/dashboard`)
  })
})
