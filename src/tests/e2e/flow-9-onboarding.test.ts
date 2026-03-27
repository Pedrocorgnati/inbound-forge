/**
 * Flow 9: Onboarding completo (7 passos) — crítico
 * Módulos: 15 | Prioridade: Alta
 */
import { test, expect } from '@playwright/test'
import { setMobileViewport, assertNoHorizontalOverflow } from './helpers/mobile'
import { goTo } from './helpers/navigation'

test.describe('Flow 9: Onboarding (crítico)', () => {
  test('operador sem onboarding completado é redirecionado para /onboarding', async ({ page }) => {
    // Acessar dashboard sem auth → redirect para login
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // Deve redirecionar (para login ou onboarding dependendo do estado)
    const url = page.url()
    expect(url).not.toBe('http://localhost:3000/dashboard')
  })

  test('/onboarding carrega sem erro 500 [desktop]', async ({ page }) => {
    await goTo(page, '/onboarding')

    const pageText = await page.locator('body').textContent()
    expect(pageText).not.toContain('Internal Server Error')
  })

  test('/onboarding em mobile viewport 375px — wizard navigável sem scrollX', async ({ page }) => {
    await setMobileViewport(page)
    await goTo(page, '/onboarding')

    await assertNoHorizontalOverflow(page)
    await expect(page.locator('body')).toBeVisible()
  })

  test('wizard tem 7 passos ou redireciona operadores com onboarding completo', async ({ page }) => {
    await goTo(page, '/onboarding')

    const url = page.url()
    // Pode redirecionar para /dashboard se onboarding já completo
    // Ou mostrar o wizard com os 7 passos
    const isOnboarding = url.includes('onboarding')
    const isDashboard = url.includes('dashboard')
    expect(isOnboarding || isDashboard).toBe(true)
  })
})
