// TASK-8 ST001/ST002 (CL-292, CL-293): leitura/escrita de SystemSetting com
// cache em memoria (60s). Fallback cascata: DB -> env -> default. Usado por
// budget-guard e alerts.

import 'server-only'
import { prisma } from '@/lib/prisma'

export const SYSTEM_SETTING_KEYS = {
  MONTHLY_BUDGET_BRL: 'monthlyBudgetBRL',
  ALERTS_EMAIL: 'alertsEmail',
  LEARN_TO_RANK: 'learnToRank',
  THEME_THROTTLE: 'themeThrottle',
  MONTHLY_COST_THRESHOLD_USD: 'monthlyCostThresholdUsd',
} as const

export const SYSTEM_SETTING_DEFAULTS = {
  monthlyBudgetBRL: 1000,
  alertsEmail: 'alertas@inbound-forge.app',
  learnToRank: { minPosts: 50, minConversions: 10 },
  themeThrottle: { perHour: 10, perDay: 50 },
  monthlyCostThresholdUsd: 0, // 0 = desabilitado
}

export type LearnToRankSettings = { minPosts: number; minConversions: number }
export type ThemeThrottleSettings = { perHour: number; perDay: number }

const CACHE_TTL_MS = 60_000
type CacheEntry = { value: unknown; expiresAt: number }
const cache = new Map<string, CacheEntry>()

export function invalidateSystemSettingCache(key?: string) {
  if (key) cache.delete(key)
  else cache.clear()
}

async function readSetting<T>(key: string): Promise<T | null> {
  const entry = cache.get(key)
  if (entry && entry.expiresAt > Date.now()) {
    return entry.value as T
  }
  try {
    const row = await prisma.systemSetting.findUnique({ where: { key } })
    const value = (row?.value ?? null) as T | null
    cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS })
    return value
  } catch {
    return null
  }
}

export async function getMonthlyBudget(): Promise<number> {
  const fromDb = await readSetting<number | string>(SYSTEM_SETTING_KEYS.MONTHLY_BUDGET_BRL)
  if (typeof fromDb === 'number' && fromDb >= 0) return fromDb
  if (typeof fromDb === 'string' && !Number.isNaN(Number(fromDb))) return Number(fromDb)
  const env = process.env.MONTHLY_BUDGET_BRL
  if (env && !Number.isNaN(Number(env))) return Number(env)
  return SYSTEM_SETTING_DEFAULTS.monthlyBudgetBRL
}

export async function getAlertsEmail(): Promise<string> {
  const fromDb = await readSetting<string>(SYSTEM_SETTING_KEYS.ALERTS_EMAIL)
  if (typeof fromDb === 'string' && fromDb.length > 0) return fromDb
  const env = process.env.ALERT_EMAIL_TO
  if (env && env.length > 0) return env
  return SYSTEM_SETTING_DEFAULTS.alertsEmail
}

export async function getLearnToRankSettings(): Promise<LearnToRankSettings> {
  const fromDb = await readSetting<Partial<LearnToRankSettings>>(
    SYSTEM_SETTING_KEYS.LEARN_TO_RANK,
  )
  const defaults = SYSTEM_SETTING_DEFAULTS.learnToRank
  return {
    minPosts: Math.max(
      10,
      typeof fromDb?.minPosts === 'number' ? fromDb.minPosts : defaults.minPosts,
    ),
    minConversions: Math.max(
      1,
      typeof fromDb?.minConversions === 'number' ? fromDb.minConversions : defaults.minConversions,
    ),
  }
}

export async function getThemeThrottleSettings(): Promise<ThemeThrottleSettings> {
  const fromDb = await readSetting<Partial<ThemeThrottleSettings>>(
    SYSTEM_SETTING_KEYS.THEME_THROTTLE,
  )
  const defaults = SYSTEM_SETTING_DEFAULTS.themeThrottle
  return {
    perHour: Math.max(
      1,
      Math.min(100, typeof fromDb?.perHour === 'number' ? fromDb.perHour : defaults.perHour),
    ),
    perDay: Math.max(
      1,
      Math.min(1000, typeof fromDb?.perDay === 'number' ? fromDb.perDay : defaults.perDay),
    ),
  }
}

// Intake-Review TASK-5 ST001 (CL-225): threshold mensal de custo em USD.
// 0 = desabilitado. Consumido por cost-alert.ts#checkMonthlyCostThreshold.
export async function getMonthlyCostThresholdUsd(): Promise<number> {
  const fromDb = await readSetting<number | string>(
    SYSTEM_SETTING_KEYS.MONTHLY_COST_THRESHOLD_USD,
  )
  if (typeof fromDb === 'number' && fromDb >= 0) return fromDb
  if (typeof fromDb === 'string' && !Number.isNaN(Number(fromDb))) return Number(fromDb)
  const env = process.env.MONTHLY_COST_THRESHOLD_USD
  if (env && !Number.isNaN(Number(env))) return Number(env)
  return SYSTEM_SETTING_DEFAULTS.monthlyCostThresholdUsd
}

export async function getAllSystemSettings(): Promise<{
  monthlyBudgetBRL: number
  alertsEmail: string
  learnToRank: LearnToRankSettings
  themeThrottle: ThemeThrottleSettings
  monthlyCostThresholdUsd: number
}> {
  const [monthlyBudgetBRL, alertsEmail, learnToRank, themeThrottle, monthlyCostThresholdUsd] =
    await Promise.all([
      getMonthlyBudget(),
      getAlertsEmail(),
      getLearnToRankSettings(),
      getThemeThrottleSettings(),
      getMonthlyCostThresholdUsd(),
    ])
  return {
    monthlyBudgetBRL,
    alertsEmail,
    learnToRank,
    themeThrottle,
    monthlyCostThresholdUsd,
  }
}

export async function upsertSystemSetting(
  key: string,
  value: unknown,
  updatedBy?: string
): Promise<void> {
  await prisma.systemSetting.upsert({
    where: { key },
    create: { key, value: value as never, updatedBy: updatedBy ?? null },
    update: { value: value as never, updatedBy: updatedBy ?? null },
  })
  invalidateSystemSettingCache(key)
}
