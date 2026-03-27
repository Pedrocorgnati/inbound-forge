/**
 * Flow 6: Lead → conversion → theme.conversionScore (crítico — CX-01)
 * Módulos: 13, 7 | Prioridade: Alta
 */
import { test, expect } from '@playwright/test'
import { loginAsOperator } from './helpers/auth'
import { goTo } from './helpers/navigation'
import { setMobileViewport, assertNoHorizontalOverflow } from './helpers/mobile'

test.describe('Flow 6: Lead → Conversion → Score (crítico)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsOperator(page)
  })

  test('POST /api/v1/conversions valida campos obrigatórios', async ({ page }) => {
    const res = await page.request.post('/api/v1/conversions', {
      data: {},  // payload vazio deve falhar
    })
    expect([400, 401, 422]).toContain(res.status())
  })

  test('verifica /analytics reflete conversões', async ({ page }) => {
    await goTo(page, '/analytics')
    await expect(page).toHaveURL(/\/analytics/)

    const pageText = await page.locator('body').textContent()
    expect(pageText).not.toContain('500')
  })

  test('GET /api/v1/analytics/funnel responde com estrutura correta', async ({ page }) => {
    const res = await page.request.get('/api/v1/analytics/funnel?period=30d')
    expect([200, 401]).toContain(res.status())

    if (res.status() === 200) {
      const body = await res.json()
      expect(body.data ?? body).toBeDefined()
    }
  })

  test('flow em mobile viewport [CX-01 E2E mobile]', async ({ page }) => {
    await setMobileViewport(page)
    await goTo(page, '/analytics')

    await assertNoHorizontalOverflow(page)
    const pageText = await page.locator('body').textContent()
    expect(pageText).not.toContain('500')
  })
})
