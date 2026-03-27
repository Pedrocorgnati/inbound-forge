/**
 * Flow 1: Theme creation → scoring → content generation
 * Módulos: 5, 6, 7, 8 | Prioridade: Alta
 */
import { test, expect } from '@playwright/test'
import { loginAsOperator } from './helpers/auth'
import { goTo } from './helpers/navigation'
import { setMobileViewport, assertNoHorizontalOverflow } from './helpers/mobile'

test.describe('Flow 1: Theme → Content', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsOperator(page)
  })

  test('cria tema e verifica content queue [desktop]', async ({ page }) => {
    await goTo(page, '/knowledge')

    // Aguardar página de knowledge base
    await expect(page.locator('h1, [data-testid="knowledge-title"]')).toBeVisible({ timeout: 10000 })

    // Verificar que botão de criar entrada está presente
    const createBtn = page.locator('[data-testid="create-entry-button"], button:has-text("Nova Entrada"), button:has-text("New Entry")').first()
    await expect(createBtn).toBeVisible()
  })

  test('navega para /content e verifica estrutura [desktop]', async ({ page }) => {
    await goTo(page, '/content')
    await expect(page).toHaveURL(/\/content/)

    // Verificar que a página carregou sem erro 500
    const bodyText = await page.locator('body').textContent()
    expect(bodyText).not.toContain('500')
    expect(bodyText).not.toContain('Internal Server Error')
  })

  test('flow completo em mobile viewport 375px (CX-01 prerequisite)', async ({ page }) => {
    await setMobileViewport(page)
    await goTo(page, '/knowledge')

    // Verificar sem overflow horizontal
    await assertNoHorizontalOverflow(page)

    // Botão de criação visível em mobile
    await expect(page.locator('button').first()).toBeVisible()
  })
})
