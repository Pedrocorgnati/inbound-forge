// TASK-4 ST001 (CL-145) — Playwright smoke visual mobile.
// Gera screenshots das rotas criticas no viewport 375x667 para baseline.
// Lighthouse CI (quando disponivel) usa target score mobile >= 85.

import { test } from '@playwright/test'

const MOBILE_VIEWPORT = { width: 375, height: 667 }

const ROUTES: Array<{ name: string; path: string }> = [
  { name: 'dashboard', path: '/pt-BR/dashboard' },
  { name: 'calendar', path: '/pt-BR/calendar' },
  { name: 'knowledge', path: '/pt-BR/knowledge' },
  { name: 'leads', path: '/pt-BR/leads' },
]

for (const route of ROUTES) {
  test(`${route.name} renders on mobile (375x667)`, async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT)
    await page.goto(route.path)
    await page.waitForLoadState('domcontentloaded')
    await page.screenshot({
      path: `docs/audits/screens/${route.name}-mobile.png`,
      fullPage: true,
    })
  })
}
