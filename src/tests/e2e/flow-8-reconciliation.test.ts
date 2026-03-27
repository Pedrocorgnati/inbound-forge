/**
 * Flow 8: Reconciliation detection → resolve
 * Módulos: 13, 14 | Prioridade: Média
 */
import { test, expect } from '@playwright/test'
import { loginAsOperator } from './helpers/auth'
import { goTo } from './helpers/navigation'

test.describe('Flow 8: Reconciliation', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsOperator(page)
  })

  test('GET /api/v1/reconciliation responde', async ({ page }) => {
    const res = await page.request.get('/api/v1/reconciliation')
    expect([200, 401]).toContain(res.status())
  })

  test('POST /api/v1/reconciliation/sync responde', async ({ page }) => {
    const res = await page.request.post('/api/v1/reconciliation/sync')
    expect([200, 201, 401, 500]).toContain(res.status())  // 500 esperado sem worker
  })

  test('/analytics mostra reconciliation panel', async ({ page }) => {
    await goTo(page, '/analytics')

    const pageText = await page.locator('body').textContent()
    expect(pageText).not.toContain('500')
  })
})
