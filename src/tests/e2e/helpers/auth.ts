/**
 * Helper E2E: autenticação
 */
import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'

export const TEST_CREDENTIALS = {
  email: process.env.E2E_TEST_EMAIL ?? 'e2e@inbound-forge.test',
  password: process.env.E2E_TEST_PASSWORD ?? 'E2eTest1234!',
}

/**
 * Faz login como operador e aguarda redirect para /dashboard
 */
export async function loginAsOperator(page: Page): Promise<void> {
  await page.goto('/login')
  await page.waitForLoadState('networkidle')

  await page.fill('[data-testid="email-input"]', TEST_CREDENTIALS.email)
  await page.fill('[data-testid="password-input"]', TEST_CREDENTIALS.password)
  await page.click('[data-testid="login-button"]')

  await page.waitForURL('**/dashboard', { timeout: 10000 })
  await expect(page).toHaveURL(/\/dashboard/)
}
