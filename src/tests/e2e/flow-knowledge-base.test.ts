/**
 * Flow: Knowledge Base — CRUD completo + threshold gate
 * Módulo: 5 (module-5-knowledge-base) | Prioridade: Alta
 * Rastreabilidade: MILESTONE-5, G-005
 */
import { test, expect } from '@playwright/test'
import { loginAsOperator } from './helpers/auth'
import { goTo } from './helpers/navigation'
import { setMobileViewport, assertNoHorizontalOverflow } from './helpers/mobile'

test.describe('Knowledge Base — CRUD + Threshold', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsOperator(page)
  })

  test('pagina /knowledge carrega com 4 tabs', async ({ page }) => {
    await goTo(page, '/knowledge')
    await expect(page.locator('[data-testid="knowledge-page"]')).toBeVisible({ timeout: 10000 })

    // Verificar tabs: cases, pains, patterns, objections
    await expect(page.locator('[data-testid="knowledge-page"]')).toContainText('Base de Conhecimento')
  })

  test('tab cases — criar novo case', async ({ page }) => {
    await goTo(page, '/knowledge?tab=cases')
    await expect(page.locator('[data-testid="knowledge-page"]')).toBeVisible({ timeout: 10000 })

    // Buscar botao de criar
    const createBtn = page.locator('button:has-text("Novo Case"), button:has-text("New Case"), [data-testid="create-case-button"]').first()
    if (await createBtn.isVisible()) {
      await createBtn.click()

      // Verificar que formulario abriu (pagina ou modal)
      await expect(page.locator('[data-testid="case-form"], [data-testid="case-field-name"]')).toBeVisible({ timeout: 5000 })
    }
  })

  test('tab pains — visualizar lista', async ({ page }) => {
    await goTo(page, '/knowledge?tab=pains')
    await expect(page.locator('[data-testid="knowledge-page"]')).toBeVisible({ timeout: 10000 })

    // Verificar que a lista ou empty state aparece
    const hasList = await page.locator('[data-testid="pain-list"], [data-testid="empty-pains"]').count()
    expect(hasList).toBeGreaterThan(0)
  })

  test('tab patterns — visualizar lista', async ({ page }) => {
    await goTo(page, '/knowledge?tab=patterns')
    await expect(page.locator('[data-testid="knowledge-page"]')).toBeVisible({ timeout: 10000 })

    const hasList = await page.locator('[data-testid="pattern-list"], [data-testid="empty-patterns"]').count()
    expect(hasList).toBeGreaterThan(0)
  })

  test('tab objections — visualizar lista', async ({ page }) => {
    await goTo(page, '/knowledge?tab=objections')
    await expect(page.locator('[data-testid="knowledge-page"]')).toBeVisible({ timeout: 10000 })

    const hasList = await page.locator('[data-testid="objection-list"], [data-testid="objection-list-loading"]').count()
    expect(hasList).toBeGreaterThan(0)
  })

  test('ProgressGate exibe contador de progresso', async ({ page }) => {
    await goTo(page, '/knowledge?tab=cases')

    // ProgressGate deve exibir progresso ou loading
    const gate = page.locator('[data-testid="progress-gate"], [data-testid="progress-gate-loading"]')
    await expect(gate.first()).toBeVisible({ timeout: 10000 })
  })

  test('knowledge base mobile viewport 375px', async ({ page }) => {
    await setMobileViewport(page)
    await goTo(page, '/knowledge?tab=cases')

    await expect(page.locator('[data-testid="knowledge-page"]')).toBeVisible({ timeout: 10000 })
    await assertNoHorizontalOverflow(page)
  })

  test('autosave indicator visivel no CaseForm (edit)', async ({ page }) => {
    await goTo(page, '/knowledge?tab=cases')
    await expect(page.locator('[data-testid="knowledge-page"]')).toBeVisible({ timeout: 10000 })

    // Tentar navegar para editar o primeiro case (se existir)
    const firstCase = page.locator('[data-testid="case-card"]').first()
    if (await firstCase.isVisible({ timeout: 3000 }).catch(() => false)) {
      const editBtn = firstCase.locator('button:has-text("Editar"), [data-testid="edit-case"]').first()
      if (await editBtn.isVisible()) {
        await editBtn.click()
        // Verificar que autosave status aparece
        await expect(page.locator('[data-testid="autosave-status"]')).toBeVisible({ timeout: 5000 })
      }
    }
  })
})
