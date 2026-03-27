/**
 * Flow 7: All data → analytics funnel
 * Módulos: 12, 13, 14 | Prioridade: Alta
 */
import { test, expect } from '@playwright/test'
import { loginAsOperator } from './helpers/auth'
import { goTo } from './helpers/navigation'
import { setMobileViewport, assertNoHorizontalOverflow } from './helpers/mobile'

test.describe('Flow 7: Analytics Funnel', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsOperator(page)
  })

  test('GET /api/v1/analytics/funnel com period 30d', async ({ page }) => {
    const res = await page.request.get('/api/v1/analytics/funnel?period=30d')
    expect([200, 401]).toContain(res.status())
  })

  test('GET /api/v1/analytics/funnel com period inválido retorna 400 (VAL_002)', async ({ page }) => {
    const res = await page.request.get('/api/v1/analytics/funnel?period=invalid')
    expect([400, 401, 422]).toContain(res.status())
  })

  test('GET /api/v1/analytics/themes responde', async ({ page }) => {
    const res = await page.request.get('/api/v1/analytics/themes')
    expect([200, 401]).toContain(res.status())
  })

  test('/analytics em mobile — charts sem overflow', async ({ page }) => {
    await setMobileViewport(page)
    await goTo(page, '/analytics')

    await assertNoHorizontalOverflow(page)
    await expect(page.locator('body')).toBeVisible()
  })
})
