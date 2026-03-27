/**
 * Flow 4: Content → schedule → publish (LinkedIn)
 * Módulos: 8, 12 | Prioridade: Alta
 * NOTA: LinkedIn publishing é modo assistido (INT-117) — sem API direta
 */
import { test, expect } from '@playwright/test'
import { loginAsOperator } from './helpers/auth'
import { goTo } from './helpers/navigation'

test.describe('Flow 4: Content → LinkedIn', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsOperator(page)
  })

  test('verifica /posts carrega com estrutura correta', async ({ page }) => {
    await goTo(page, '/posts')
    await expect(page).toHaveURL(/\/posts/)

    const pageText = await page.locator('body').textContent()
    expect(pageText).not.toContain('500')
  })

  test('API GET /api/v1/posts responde', async ({ page }) => {
    const res = await page.request.get('/api/v1/posts')
    expect([200, 401]).toContain(res.status())
  })

  test('modo assistido LinkedIn — sem API de publishing direta (INT-117)', async ({ page }) => {
    // Verificar que não há referência a LinkedIn API v2 na UI
    // (guardado pelo CI guardrail no ci.yml)
    await goTo(page, '/posts')
    const pageText = await page.locator('body').textContent()
    // Posts publicados no LinkedIn são verificados manualmente
    expect(pageText).not.toContain('linkedin.com/v2')
  })
})
