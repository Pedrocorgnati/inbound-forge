/**
 * Instagram client wrapper — module-12-calendar-publishing
 * Retorna null se variáveis não estão configuradas (graceful disable em dev).
 * INT-118 | INT-021
 */

export interface InstagramConfig {
  appId: string
  appSecret: string
  userAccessToken: string
  businessAccountId: string
}

export function getInstagramConfig(): InstagramConfig | null {
  const {
    INSTAGRAM_APP_ID,
    INSTAGRAM_APP_SECRET,
    INSTAGRAM_USER_ACCESS_TOKEN,
    INSTAGRAM_BUSINESS_ACCOUNT_ID,
  } = process.env

  if (
    !INSTAGRAM_APP_ID ||
    !INSTAGRAM_APP_SECRET ||
    !INSTAGRAM_USER_ACCESS_TOKEN ||
    !INSTAGRAM_BUSINESS_ACCOUNT_ID
  ) {
    return null
  }

  return {
    appId: INSTAGRAM_APP_ID,
    appSecret: INSTAGRAM_APP_SECRET,
    userAccessToken: INSTAGRAM_USER_ACCESS_TOKEN,
    businessAccountId: INSTAGRAM_BUSINESS_ACCOUNT_ID,
  }
}

export function isInstagramConfigured(): boolean {
  return getInstagramConfig() !== null
}
