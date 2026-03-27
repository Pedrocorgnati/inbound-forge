/**
 * Helper E2E: viewport mobile
 * mobile_first.enabled = true — iPhone 13 (375x812)
 */
import type { Page } from '@playwright/test'

export const MOBILE_VIEWPORT = { width: 375, height: 812 }

/**
 * Configura viewport para iPhone 13 (mobile_first)
 */
export async function setMobileViewport(page: Page): Promise<void> {
  await page.setViewportSize(MOBILE_VIEWPORT)
}

/**
 * Verifica ausência de scroll horizontal (overflow)
 */
export async function assertNoHorizontalOverflow(page: Page): Promise<void> {
  const hasOverflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth
  })
  if (hasOverflow) {
    throw new Error(
      `Horizontal overflow detected (scrollWidth > clientWidth). Viewport: ${MOBILE_VIEWPORT.width}px`
    )
  }
}
