/**
 * a11y-module15.spec.ts — TASK-REFORGE-4 ST003
 * Scan Axe-core para conformidade WCAG 2.1 AA — páginas do module-15
 *
 * Requer: @axe-core/playwright instalado
 *   npm install -D @axe-core/playwright
 */
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const LOCALE = process.env.TEST_LOCALE ?? 'pt-BR'

const MODULE_15_PAGES = [
  { name: 'Health', path: `/${LOCALE}/health` },
  { name: 'Onboarding', path: `/${LOCALE}/onboarding` },
]

for (const page of MODULE_15_PAGES) {
  test(`${page.name} — zero violações WCAG 2.1 AA`, async ({ page: browserPage }) => {
    await browserPage.goto(page.path)
    await browserPage.waitForLoadState('networkidle')

    const results = await new AxeBuilder({ page: browserPage })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze()

    // Reportar violações para diagnóstico antes de falhar
    if (results.violations.length > 0) {
      console.error(
        `A11y violations on ${page.path}:\n`,
        results.violations.map((v) => `  [${v.impact}] ${v.id}: ${v.description}`).join('\n')
      )
    }

    expect(results.violations).toHaveLength(0)
  })
}
