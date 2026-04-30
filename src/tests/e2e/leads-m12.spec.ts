/**
 * PA-05 — E2E M12: LeadForm happy path, kanban pipeline move, journey timeline.
 * Playwright — requer ambiente integrado (next dev + DB vivo).
 */
import { test, expect } from '@playwright/test'
import { loginAsOperator } from './helpers/auth'
import { goTo } from './helpers/navigation'

test.describe('M12 — Leads /new happy path', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsOperator(page)
  })

  test('registra lead completo via /leads/new e redireciona para /leads', async ({ page }) => {
    await goTo(page, '/leads/new')
    await expect(page.getByTestId('lead-form')).toBeVisible()

    await page.getByTestId('lead-field-name').fill('Pedro Teste E2E')
    await page.getByTestId('lead-field-company').fill('Acme Corp')
    await page.getByTestId('lead-field-contactInfo').fill('pedro@acme.com | +55 11 98765-4321')
    await page.getByTestId('lead-field-channel').selectOption('BLOG')
    await page.getByTestId('lead-field-funnelStage').selectOption('AWARENESS')
    // firstTouchAt defaults to today — skip manual fill

    await page.getByTestId('lead-field-lgpdConsent').check()
    await expect(page.getByTestId('lead-submit')).toBeEnabled()

    await page.getByTestId('lead-submit').click()
    await expect(page).toHaveURL(/\/leads$/, { timeout: 10_000 })
    await expect(page.locator('body')).not.toContainText('500')
  })

  test('submit sem LGPD mantém botão desabilitado', async ({ page }) => {
    await goTo(page, '/leads/new')
    await page.getByTestId('lead-field-name').fill('Sem Consent')
    await page.getByTestId('lead-field-contactInfo').fill('sem@consent.com')
    await expect(page.getByTestId('lead-submit')).toBeDisabled()
  })

  test('submit com nome vazio mostra erro de validação', async ({ page }) => {
    await goTo(page, '/leads/new')
    await page.getByTestId('lead-field-lgpdConsent').check()
    await page.getByTestId('lead-submit').click()
    // Nome é obrigatório — deve aparecer mensagem de erro
    await expect(page.locator('[role="alert"]').first()).toBeVisible()
  })
})

test.describe('M12 — Kanban pipeline move', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsOperator(page)
  })

  test('aba Kanban carrega sem erro e exibe colunas', async ({ page }) => {
    await goTo(page, '/leads')
    const kanbanTab = page.getByTestId('tab-kanban')
    await expect(kanbanTab).toBeVisible()
    await kanbanTab.click()

    // Aguarda colunas aparecerem (ou empty state)
    await expect(
      page.locator('[data-testid^="column-"]').first().or(
        page.locator('text=Carregando kanban')
      )
    ).toBeVisible({ timeout: 8_000 })
  })

  test('drag-drop move via teclado: ArrowRight move card para próxima coluna', async ({ page }) => {
    await goTo(page, '/leads')
    await page.getByTestId('tab-kanban').click()

    const newColumn = page.getByTestId('column-new')
    await expect(newColumn).toBeVisible({ timeout: 8_000 })

    const firstCard = newColumn.locator('li[draggable="true"]').first()
    if (!(await firstCard.isVisible())) {
      test.skip(true, 'Sem leads NEW disponíveis para mover')
      return
    }

    await firstCard.focus()
    await firstCard.press('ArrowRight')

    // Aguarda toast de confirmação
    await expect(page.locator('text=Lead movido').or(page.locator('[role="status"]'))).toBeVisible({
      timeout: 5_000,
    })
  })
})

test.describe('M12 — Journey timeline', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsOperator(page)
  })

  test('página de detalhe do lead exibe seção de jornada', async ({ page }) => {
    await goTo(page, '/leads')

    // Clica no primeiro lead disponível
    const firstLeadLink = page.locator('a[href*="/leads/"]').first()
    if (!(await firstLeadLink.isVisible())) {
      test.skip(true, 'Sem leads cadastrados para verificar journey')
      return
    }

    await firstLeadLink.click()
    await expect(page.getByTestId('lead-journey')).toBeVisible()

    // Verifica que a timeline tem pelo menos um evento (form-submit sempre existe)
    await expect(
      page.locator('[data-testid="lead-journey"] li, [data-testid="lead-journey"] [role="listitem"]').first()
    ).toBeVisible({ timeout: 5_000 })
  })
})
