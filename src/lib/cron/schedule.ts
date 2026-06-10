/**
 * Rastreabilidade: CL-197, TASK-3 ST001
 * Registry de cron jobs do projeto.
 * Schedules declarados em vercel.json (produção) ou railway.toml (workers externos).
 */

export interface CronJobDefinition {
  path: string
  schedule: string
  description: string
}

export const CRON_JOBS: CronJobDefinition[] = [
  {
    path: '/api/cron/worker-silence-check',
    schedule: '*/5 * * * *',
    description: 'Verifica silêncio de workers (a cada 5min)',
  },
  {
    path: '/api/cron/ga4-sync',
    schedule: '0 3 * * *',
    description: 'Sincroniza GA4 diariamente às 03:00 UTC',
  },
  {
    path: '/api/cron/lgpd-purge',
    schedule: '0 2 * * *',
    description: 'Purge LGPD diário às 02:00 UTC',
  },
  {
    path: '/api/cron/budget-check',
    schedule: '0 */6 * * *',
    description: 'Budget burn rate check a cada 6h (TASK-4)',
  },
  {
    path: '/api/cron/rescraping',
    schedule: '0 3 * * 2',
    description: 'Re-scraping semanal — terça 03:00 UTC (TASK-6)',
  },
  {
    path: '/api/cron/reconciliation',
    schedule: '0 12 * * 1',
    description: 'Reconciliação semanal — segunda 12:00 UTC / 09:00 BRT (TASK-3)',
  },
  {
    path: '/api/cron/token-expiration',
    schedule: '0 8 * * *',
    description: 'Monitor de expiração de tokens — diário 08:00 UTC (TASK-8 / WK-WRK-07)',
  },
]
