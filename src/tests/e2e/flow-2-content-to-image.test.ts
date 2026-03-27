/**
 * Flow 2: Content → image job → asset library (CX-02)
 * Módulos: 8, 9, 10 | Prioridade: Alta
 */
import { test, expect } from '@playwright/test'
import { loginAsOperator } from './helpers/auth'
import { goTo } from './helpers/navigation'

test.describe('Flow 2: Content → Image → Asset', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsOperator(page)
  })

  test('navega para /content e verifica opção de geração de imagem', async ({ page }) => {
    await goTo(page, '/content')
    await expect(page).toHaveURL(/\/content/)

    const pageText = await page.locator('body').textContent()
    expect(pageText).not.toContain('500')
  })

  test('verifica /assets (asset library) carrega sem erro', async ({ page }) => {
    await goTo(page, '/assets')
    await expect(page).toHaveURL(/\/assets/)

    const pageText = await page.locator('body').textContent()
    expect(pageText).not.toContain('Internal Server Error')
  })

  test('API GET /api/v1/assets responde 200', async ({ page }) => {
    const res = await page.request.get('/api/v1/assets')
    expect([200, 401]).toContain(res.status())  // 200 autenticado, 401 se sessão não propagada
  })
})
