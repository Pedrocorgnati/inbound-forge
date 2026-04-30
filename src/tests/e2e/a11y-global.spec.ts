/**
 * a11y-global.spec.ts — TASK-12 ST001
 * Auditoria WCAG 2.1 AA global — todas as rotas protegidas
 *
 * Cobre rotas que NÃO foram auditadas por a11y-module15.spec.ts (que cobre /health e /onboarding).
 *
 * Requer: @axe-core/playwright (instalado)
 * Execução: `npx playwright test src/tests/e2e/a11y-global.spec.ts`
 *           Necessário: dev server rodando + sessão autenticada (storageState)
 */
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const LOCALE = process.env.TEST_LOCALE ?? 'pt-BR'

const PROTECTED_PAGES = [
  { name: 'Dashboard', path: `/${LOCALE}/dashboard` },
  { name: 'Knowledge', path: `/${LOCALE}/knowledge` },
  { name: 'Calendar', path: `/${LOCALE}/calendar` },
  { name: 'Analytics', path: `/${LOCALE}/analytics` },
  { name: 'Content', path: `/${LOCALE}/content` },
  { name: 'Leads', path: `/${LOCALE}/leads` },
  { name: 'Blog Admin', path: `/${LOCALE}/blog` },
  { name: 'Asset Library', path: `/${LOCALE}/assets` },
  { name: 'Theme Scoring', path: `/${LOCALE}/themes` },
]

for (const target of PROTECTED_PAGES) {
  test(`[A11y] ${target.name} — WCAG 2.1 AA sem violações críticas/sérias`, async ({ page }) => {
    await page.goto(target.path)
    await page.waitForLoadState('networkidle')

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .exclude('[data-testid="chart-wrapper"]') // charts com axe-safe wrapper
      .analyze()

    const blocking = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    )

    if (blocking.length > 0) {
      console.log(`\n[A11y] ${target.name} — violações:`)
      for (const v of blocking) {
        console.log(`  - ${v.id} (${v.impact}): ${v.description}`)
        for (const node of v.nodes.slice(0, 3)) {
          console.log(`    target: ${node.target.join(', ')}`)
        }
      }
    }

    expect(blocking).toHaveLength(0)
  })
}
