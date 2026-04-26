// TASK-4 ST003 — A11y baseline via axe-core + navegacao por teclado no bento grid.
// Rastreabilidade: CL-267
//
// STATUS: STUB — @axe-core/playwright ainda nao esta em dependencies.
// Acao manual: `npm i -D @axe-core/playwright` antes de remover o test.skip.

import { test, expect } from '@playwright/test'
// import AxeBuilder from '@axe-core/playwright' // TODO: instalar dep

const TARGETS = ['/dashboard', '/calendar', '/analytics']

test.describe('bento grid — acessibilidade', () => {
  test.skip(true, 'Pendente: instalar @axe-core/playwright')

  for (const path of TARGETS) {
    test(`${path} sem violations serias`, async ({ page: _page }) => {
      // const { violations } = await new AxeBuilder({ page })
      //   .withTags(['wcag2a', 'wcag2aa'])
      //   .analyze()
      // const serious = violations.filter(v => ['serious', 'critical'].includes(v.impact ?? ''))
      // expect(serious).toEqual([])
    })
  }

  test('navegacao por teclado ativa card focado', async ({ page }) => {
    await page.goto('/dashboard')
    // Tab ate o grid
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    // Avanca 2 cards
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowRight')
    // Ativa
    const focused = await page.evaluate(() => document.activeElement?.getAttribute('role'))
    expect(focused).toBe('gridcell')
  })
})
