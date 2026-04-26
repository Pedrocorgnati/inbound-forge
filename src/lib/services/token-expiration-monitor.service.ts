// token-expiration-monitor — checa tokens e gera alertas (TASK-8 ST003 / CL-249)

import 'server-only'
import { prisma } from '@/lib/prisma'
import { testCredential, recordTestResult } from '@/lib/services/credential-tester.service'
import { sendAlertEmail } from '@/lib/alert-email'

const PROVIDERS = ['instagram', 'openai', 'anthropic', 'ga4'] as const
const WARN_DAYS = 7
const CRITICAL_DAYS = 3
const SETTING_PREFIX = 'apiKey.'

const DAY_MS = 24 * 60 * 60 * 1000

function daysUntil(date: Date): number {
  return Math.floor((date.getTime() - Date.now()) / DAY_MS)
}

async function alreadyAlertedToday(type: string): Promise<boolean> {
  const startOfDay = new Date()
  startOfDay.setUTCHours(0, 0, 0, 0)
  const existing = await prisma.alertLog.findFirst({
    where: { type, createdAt: { gte: startOfDay } },
  })
  return !!existing
}

export interface MonitorReport {
  provider: string
  status: 'OK' | 'WARN' | 'CRITICAL' | 'FAILED' | 'MISSING'
  daysUntilExpiration?: number
  message: string
}

export async function runTokenExpirationMonitor(): Promise<MonitorReport[]> {
  const reports: MonitorReport[] = []

  for (const provider of PROVIDERS) {
    try {
      const probe = await testCredential(provider)
      await recordTestResult(provider, probe)

      if (!probe.ok && probe.message.includes('nao configurada')) {
        reports.push({ provider, status: 'MISSING', message: probe.message })
        continue
      }

      if (!probe.ok) {
        const type = `credential_failed_${provider}`
        if (!(await alreadyAlertedToday(type))) {
          await sendAlertEmail({
            subject: `⚠ Credencial ${provider} falhou no healthcheck`,
            body: `Teste automatico da credencial ${provider} falhou: ${probe.message}`,
            severity: 'CRITICAL',
            logType: type,
            metadata: { provider, status: probe.status },
          })
        }
        reports.push({ provider, status: 'FAILED', message: probe.message })
        continue
      }

      // Check expiration metadata (stored on SystemSetting.value.tokenExpiresAt, set externally when known)
      const row = await prisma.systemSetting.findUnique({
        where: { key: SETTING_PREFIX + provider },
      })
      const meta = (row?.value as Record<string, unknown> | null) ?? {}
      const expiresRaw = typeof meta.tokenExpiresAt === 'string' ? meta.tokenExpiresAt : null
      if (!expiresRaw) {
        reports.push({ provider, status: 'OK', message: probe.message })
        continue
      }
      const expiresAt = new Date(expiresRaw)
      if (isNaN(expiresAt.getTime())) {
        reports.push({ provider, status: 'OK', message: probe.message })
        continue
      }
      const days = daysUntil(expiresAt)

      if (days <= CRITICAL_DAYS) {
        const type = `credential_expiring_critical_${provider}`
        if (!(await alreadyAlertedToday(type))) {
          await sendAlertEmail({
            subject: `🚨 Token ${provider} expira em ${days} dia(s)`,
            body: `A credencial ${provider} expira em ${expiresAt.toISOString()} (${days}d). Renove agora.`,
            severity: 'CRITICAL',
            logType: type,
            metadata: { provider, daysUntilExpiration: days },
          })
        }
        reports.push({ provider, status: 'CRITICAL', daysUntilExpiration: days, message: 'expira em ate 3 dias' })
      } else if (days <= WARN_DAYS) {
        const type = `credential_expiring_warn_${provider}`
        if (!(await alreadyAlertedToday(type))) {
          await sendAlertEmail({
            subject: `⚠ Token ${provider} expira em ${days} dias`,
            body: `A credencial ${provider} expira em ${expiresAt.toISOString()} (${days}d). Planeje renovacao.`,
            severity: 'WARNING',
            logType: type,
            metadata: { provider, daysUntilExpiration: days },
          })
        }
        reports.push({ provider, status: 'WARN', daysUntilExpiration: days, message: 'expira em ate 7 dias' })
      } else {
        reports.push({ provider, status: 'OK', daysUntilExpiration: days, message: 'token valido' })
      }
    } catch (err) {
      console.error(`[token-monitor] erro em ${provider}:`, err)
      reports.push({
        provider,
        status: 'FAILED',
        message: err instanceof Error ? err.message : 'falha desconhecida',
      })
    }
  }

  return reports
}
