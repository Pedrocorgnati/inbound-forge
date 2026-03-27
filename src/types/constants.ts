export const BUSINESS_RULES = {
  // Conteúdo
  MAX_CONTENT_PER_DAY: 5,
  MIN_THEME_SCORE_TO_APPROVE: 60,
  MAX_CONTENT_ANGLE_VARIANTS: 5,
  MAX_CONTENT_REJECTIONS_BEFORE_ARCHIVE: 3,

  // Scraping
  MAX_SCRAPED_TEXT_LENGTH: 50_000,
  SCRAPED_TEXT_TTL_HOURS: 1,

  // Leads
  LEAD_RETENTION_YEARS: 2,

  // Logs
  ALERT_LOG_RETENTION_DAYS: 30,
  API_USAGE_LOG_RETENTION_DAYS: 90,

  // Auth — rate limit e lock progressivo (SEC-005 / THREAT-001 / RN-016)
  MAX_LOGIN_ATTEMPTS: 5,
  ACCOUNT_LOCK_DURATION_MINUTES: 30, // mantido por compatibilidade; usar getLockoutDurationSeconds()

  // Progressive lock escalation
  // 1ª violação (failedLogins >= 5):  15 min
  // 2ª violação (failedLogins >= 10): 1 hora
  // 3ª+ violação (failedLogins >= 15): 24 horas
  ACCOUNT_LOCK_THRESHOLD_TIER2: 10,
  ACCOUNT_LOCK_THRESHOLD_TIER3: 15,
  ACCOUNT_LOCK_DURATION_TIER1_SECONDS: 900,    // 15 min
  ACCOUNT_LOCK_DURATION_TIER2_SECONDS: 3600,   // 1 hora
  ACCOUNT_LOCK_DURATION_TIER3_SECONDS: 86400,  // 24 horas

  // Workers
  WORKER_HEARTBEAT_INTERVAL_SECONDS: 30,
  WORKER_HEARTBEAT_TTL_SECONDS: 60,

  // Pagination
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,

  // Blog
  MIN_ARTICLE_WORD_COUNT: 800,
  MAX_ARTICLE_WORD_COUNT: 5_000,
} as const

export type BusinessRule = keyof typeof BUSINESS_RULES
