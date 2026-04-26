/**
 * Rate Limits — Inbound Forge
 * TASK-5 ST004 / intake-review Publishing Service
 *
 * Limites explícitos da Instagram Graph API (CL-057).
 * Referência: https://developers.facebook.com/docs/graph-api/overview/rate-limiting/
 */

export const INSTAGRAM_RATE_LIMITS = {
  requestsPerHour: 200,   // 200 requisições por hora por token
  postsPerDay: 100,       // 100 posts por período de 24h por conta
  storiesPerDay: 100,     // 100 stories por período de 24h
  windowMs: 3600 * 1000, // janela de 1 hora em ms
  dayWindowMs: 24 * 3600 * 1000, // janela de 24h em ms
} as const

export const PUBLISHING_DEFAULTS = {
  maxRetries: 3,
  retryBackoffMs: 600_000,     // 10 minutos de backoff
  maxBackoffMs: 3_600_000,     // máximo 1h de backoff
  batchSize: 20,               // posts processados por execução do worker
  workerCronSchedule: '*/5 * * * *', // a cada 5 minutos
} as const
