/**
 * Helper E2E: seed de dados de teste via API
 */
import type { Page } from '@playwright/test'

export interface SeedResult {
  themeId: string
  contentId: string
  postId: string
  leadId: string
}

/**
 * Seed de dados de teste para flows E2E
 * Cria via API (operador já autenticado via cookies da sessão)
 */
export async function seedTestData(page: Page): Promise<SeedResult> {
  const baseURL = page.context().browser()?.version() ? 'http://localhost:3000' : ''

  // Theme
  const themeRes = await page.request.post(`${baseURL}/api/v1/themes`, {
    data: { name: `E2E Theme ${Date.now()}` },
  })
  const theme = await themeRes.json()
  const themeId = theme.data?.id ?? theme.id

  // Content (via content generation — usar endpoint de create direto para teste)
  const contentRes = await page.request.post(`${baseURL}/api/v1/content`, {
    data: {
      themeId,
      title: 'E2E Test Content',
      body: 'Test body for E2E flow',
      channel: 'LINKEDIN',
      angle: 'AUTHORIAL',
    },
  }).catch(() => null)

  const contentId = contentRes ? (await contentRes.json()).data?.id : null

  // Post
  const postRes = contentId
    ? await page.request.post(`${baseURL}/api/v1/posts`, {
        data: { contentPieceId: contentId, channel: 'LINKEDIN' },
      }).catch(() => null)
    : null

  const postId = postRes ? (await postRes.json()).data?.id : null

  // Lead
  const leadRes = await page.request.post(`${baseURL}/api/v1/leads`, {
    data: {
      themeId,
      contactInfo: 'E2E Test Lead',
      lgpdConsent: true,
      funnelStage: 'AWARENESS',
    },
  }).catch(() => null)

  const leadId = leadRes ? (await leadRes.json()).data?.id : null

  return { themeId, contentId, postId, leadId }
}
