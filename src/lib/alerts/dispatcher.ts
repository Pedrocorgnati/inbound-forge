/**
 * Rastreabilidade: CL-305, TASK-4 ST001 + ST002
 * Dispatcher central de alertas: roteia por severity, dedup via Redis, retry exp.
 *
 * Mapping: low=log-only, medium=slack, high=slack, critical=slack+email
 * Dedup: Redis key alert:dedup:{type}:{identifier} TTL 1h
 */
import { redis } from '@/lib/redis'
import { sendSlackAlert } from './channels/slack'
import { sendEmailAlert } from './channels/email'

export interface AlertInput {
  id?: string
  type: string
  severity: string
  message: string
}

export interface DispatchResult {
  dispatched: boolean
  channels: string[]
  deduped?: boolean
  error?: string
}

const DEDUP_TTL_SECONDS = 3600

function dedupKey(type: string): string {
  return `alert:dedup:${type}`
}

async function shouldSkipDedup(type: string): Promise<boolean> {
  const key = dedupKey(type)
  const exists = await redis.get<string>(key)
  return exists !== null
}

async function markDispatched(type: string): Promise<void> {
  await redis.set(dedupKey(type), '1', { ex: DEDUP_TTL_SECONDS })
}

async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> {
  const backoff = [0, 1000, 3000]
  let lastErr: unknown
  for (let i = 0; i < maxAttempts; i++) {
    if (i > 0) await new Promise((r) => setTimeout(r, backoff[i]))
    try {
      return await fn()
    } catch (err) {
      lastErr = err
    }
  }
  throw lastErr
}

export async function dispatchAlert(alert: AlertInput): Promise<DispatchResult> {
  const sev = alert.severity.toLowerCase()
  const channels: string[] = []

  if (sev === 'low') {
    console.info(`[dispatcher] alert low (log-only) | type=${alert.type}`)
    return { dispatched: false, channels: ['log'] }
  }

  const deduped = await shouldSkipDedup(alert.type)
  if (deduped) {
    console.info(`[dispatcher] deduped | type=${alert.type}`)
    return { dispatched: false, channels: [], deduped: true }
  }

  const errors: string[] = []

  if (sev === 'medium' || sev === 'high' || sev === 'critical') {
    try {
      await withRetry(() => sendSlackAlert(alert))
      channels.push('slack')
    } catch (err) {
      errors.push(`slack: ${String(err)}`)
      console.error('[dispatcher] slack failed', err)
    }
  }

  if (sev === 'critical') {
    try {
      await withRetry(() => sendEmailAlert(alert))
      channels.push('email')
    } catch (err) {
      errors.push(`email: ${String(err)}`)
      console.error('[dispatcher] email failed', err)
    }
  }

  if (channels.length > 0) {
    await markDispatched(alert.type)
  }

  return {
    dispatched: channels.length > 0,
    channels,
    error: errors.length > 0 ? errors.join('; ') : undefined,
  }
}
