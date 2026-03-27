/**
 * Helper E2E: navegação
 */
import type { Page } from '@playwright/test'

/**
 * Navega para uma rota e aguarda a página estar pronta
 */
export async function goTo(page: Page, route: string): Promise<void> {
  await page.goto(route)
  await page.waitForLoadState('networkidle')
}
