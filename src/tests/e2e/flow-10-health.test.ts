/**
 * Flow 10: Health polling → alert → resolve
 * Módulos: 15, 1 | Prioridade: Média
 */
import { test, expect } from '@playwright/test'
import { loginAsOperator } from './helpers/auth'
import { goTo } from './helpers/navigation'

test.describe('Flow 10: Health Polling', () => {
  test('GET /api/v1/health retorna 200 sem autenticação (< 500ms)', async ({ page }) => {
    const start = Date.now()
    const res = await page.request.get('/api/v1/health')
    const elapsed = Date.now() - start

    expect(res.status()).toBe(200)
    expect(elapsed).toBeLessThan(500)

    const body = await res.json()
    expect(body.status).toBe('ok')
  })

  test('GET /api/v1/health/detailed sem auth retorna 401', async ({ page }) => {
    const res = await page.request.get('/api/v1/health/detailed')
    expect(res.status()).toBe(401)
  })

  test('/health carrega HealthCards sem erro [desktop]', async ({ page }) => {
    await loginAsOperator(page)
    await goTo(page, '/health')

    await expect(page).toHaveURL(/\/health/)
    const pageText = await page.locator('body').textContent()
    expect(pageText).not.toContain('Internal Server Error')
  })

  test('GET /api/v1/health/detailed com auth retorna status dos serviços', async ({ page }) => {
    await loginAsOperator(page)
    const res = await page.request.get('/api/v1/health/detailed')
    expect([200, 503]).toContain(res.status())  // 503 se DB indisponível em CI

    if (res.status() === 200) {
      const body = await res.json()
      expect(body.database ?? body.data?.database).toBeDefined()
    }
  })
})
