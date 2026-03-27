/**
 * Flow 3: Content → schedule → publish (blog)
 * Módulos: 8, 11, 12 | Prioridade: Alta
 */
import { test, expect } from '@playwright/test'
import { loginAsOperator } from './helpers/auth'
import { goTo } from './helpers/navigation'

test.describe('Flow 3: Content → Blog', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsOperator(page)
  })

  test('verifica /blog carrega sem erro', async ({ page }) => {
    await goTo(page, '/blog')
    await expect(page).toHaveURL(/\/blog/)

    const pageText = await page.locator('body').textContent()
    expect(pageText).not.toContain('500')
  })

  test('API GET /api/v1/blog/articles responde', async ({ page }) => {
    const res = await page.request.get('/api/v1/blog/articles')
    expect([200, 401]).toContain(res.status())
  })

  test('verifica /calendar (scheduling) carrega', async ({ page }) => {
    await goTo(page, '/calendar')
    const pageText = await page.locator('body').textContent()
    expect(pageText).not.toContain('Internal Server Error')
  })
})
