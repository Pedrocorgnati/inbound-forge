// Cron job: verifica tokens (OpenAI, Instagram, GA4, Anthropic) diariamente.
// Agendamento (Railway cron): "0 8 * * *" UTC (TASK-8 ST003 / CL-249)

import { runTokenExpirationMonitor } from '@/lib/services/token-expiration-monitor.service'

async function main() {
  const started = Date.now()
  console.log('[check-token-expiration] iniciado', new Date().toISOString())
  try {
    const reports = await runTokenExpirationMonitor()
    for (const r of reports) {
      console.log(
        `[check-token-expiration] ${r.provider}: ${r.status}${
          r.daysUntilExpiration !== undefined ? ` (${r.daysUntilExpiration}d)` : ''
        } — ${r.message}`,
      )
    }
    console.log('[check-token-expiration] concluido em', Date.now() - started, 'ms')
  } catch (err) {
    console.error('[check-token-expiration] erro:', err)
    process.exit(1)
  }
}

void main()
