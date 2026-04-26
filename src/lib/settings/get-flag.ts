// TASK-14 (CL-251): leitura/escrita de flags boolean em SystemSetting com cache
// de 60s. Chaves reservadas em FLAGS constante.

import 'server-only'
import {
  invalidateSystemSettingCache,
  upsertSystemSetting,
} from '@/lib/settings/system-settings'
import { prisma } from '@/lib/prisma'

export const FLAGS = {
  SCRAPING_ENABLED: 'scrapingEnabled',
} as const

export const FLAG_DEFAULTS: Record<string, boolean> = {
  [FLAGS.SCRAPING_ENABLED]: true,
}

const CACHE_TTL_MS = 60_000
const cache = new Map<string, { value: boolean; expiresAt: number }>()

export async function getFlag(key: string): Promise<boolean> {
  const hit = cache.get(key)
  if (hit && hit.expiresAt > Date.now()) return hit.value

  try {
    const row = await prisma.systemSetting.findUnique({ where: { key } })
    const raw = row?.value as unknown
    const value =
      typeof raw === 'boolean'
        ? raw
        : typeof raw === 'string'
          ? raw === 'true'
          : (FLAG_DEFAULTS[key] ?? false)
    cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS })
    return value
  } catch {
    return FLAG_DEFAULTS[key] ?? false
  }
}

export async function setFlag(key: string, value: boolean, updatedBy?: string): Promise<void> {
  await upsertSystemSetting(key, value, updatedBy)
  invalidateSystemSettingCache(key)
  cache.delete(key)
}
