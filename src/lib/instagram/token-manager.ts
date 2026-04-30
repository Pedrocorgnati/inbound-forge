/**
 * Token Manager — module-12-calendar-publishing
 * Gerencia long-lived access token do Instagram (expira em 90 dias).
 * Refresh automático após 60 dias. Warning se < 7 dias para expirar.
 * INT-118 | SYS_003
 */
import { prisma } from '@/lib/prisma'
import { getInstagramConfig } from '@/lib/instagram-client'
import {
  TOKEN_EXPIRY_WARNING_DAYS,
  TOKEN_REFRESH_THRESHOLD_DAYS,
  TOKEN_ALERT_THRESHOLDS,
  type TokenAlertSeverity,
} from '@/lib/constants/publishing'
import { createInstagramClient } from './instagram-client'

export interface StoredToken {
  token: string
  expiresAt: Date
}

export interface TokenStatus {
  daysUntilExpiry: number
  isExpired: boolean
  needsRefresh: boolean
  /** TASK-13 ST002 (G-003) — severity tiered (info/warning/critical/none). */
  severity: TokenAlertSeverity
  /** Backwards-compatible: equivale a severity !== 'none' && !isExpired. */
  hasWarning: boolean
  warningMessage: string | null
}

/**
 * TASK-13 ST002 (G-003) — calcula severity tiered baseado em
 * TOKEN_ALERT_THRESHOLDS (info=30 / warning=15 / critical=7 dias).
 */
export function computeTokenSeverity(daysUntilExpiry: number, isExpired: boolean): TokenAlertSeverity {
  if (isExpired) return 'critical'
  if (daysUntilExpiry <= TOKEN_ALERT_THRESHOLDS.critical) return 'critical'
  if (daysUntilExpiry <= TOKEN_ALERT_THRESHOLDS.warning) return 'warning'
  if (daysUntilExpiry <= TOKEN_ALERT_THRESHOLDS.info) return 'info'
  return 'none'
}

/**
 * Busca token armazenado no banco (app_settings).
 * Fallback: variáveis de ambiente (token inicial).
 */
async function getStoredToken(): Promise<StoredToken | null> {
  // Tentar buscar token persistido no banco via app_settings
  try {
    const setting = await prisma.$queryRaw<Array<{ value: string }>>`
      SELECT value FROM app_settings WHERE key = 'instagram_token_data' LIMIT 1
    `.catch(() => [])

    if (Array.isArray(setting) && setting.length > 0) {
      const parsed = JSON.parse(setting[0].value) as { token: string; expiresAt: string }
      return { token: parsed.token, expiresAt: new Date(parsed.expiresAt) }
    }
  } catch {
    // tabela ainda não existe — usar variável de ambiente
  }

  // Fallback: usar token do .env (sem data de expiração rastreada)
  const config = getInstagramConfig()
  if (!config) return null

  return {
    token: config.userAccessToken,
    // Assumir que token do env tem vida completa de 90 dias a partir de agora
    expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
  }
}

/**
 * Persiste novo token no banco para refresh tracking.
 */
async function persistToken(token: string, expiresAt: Date): Promise<void> {
  const value = JSON.stringify({ token, expiresAt: expiresAt.toISOString() })
  try {
    await prisma.$executeRaw`
      INSERT INTO app_settings (key, value, updated_at)
      VALUES ('instagram_token_data', ${value}, NOW())
      ON CONFLICT (key) DO UPDATE SET value = ${value}, updated_at = NOW()
    `
  } catch {
    // tabela ainda não existe — ignorar silenciosamente
    console.warn('[token-manager] Não foi possível persistir token Instagram no banco')
  }
}

/**
 * Retorna token válido, com refresh automático se necessário.
 * Lança SYS_003 se token expirado.
 */
export async function getValidToken(): Promise<string> {
  const stored = await getStoredToken()
  if (!stored) {
    throw Object.assign(
      new Error('Token Instagram não configurado. Configure as variáveis INSTAGRAM_*.'),
      { code: 'SYS_003' }
    )
  }

  const daysUntilExpiry = (stored.expiresAt.getTime() - Date.now()) / 86_400_000

  if (daysUntilExpiry <= 0) {
    throw Object.assign(
      new Error('Token Instagram expirado. Reconectar conta no painel.'),
      { code: 'SYS_003' }
    )
  }

  // Refresh automático quando próximo do threshold (60 dias)
  if (daysUntilExpiry <= TOKEN_REFRESH_THRESHOLD_DAYS) {
    try {
      const config = getInstagramConfig()
      if (config) {
        const client = createInstagramClient(stored.token, config.businessAccountId)
        const { newToken, expiresAt } = await client.refreshToken()
        await persistToken(newToken, expiresAt)
        return newToken
      }
    } catch {
      // Log warning mas não falha (token ainda válido)
      console.warn('[token-manager] Falha no refresh automático do token Instagram')
    }
  }

  return stored.token
}

/**
 * Retorna status do token para uso em dashboard/pre-checks.
 */
export async function getTokenStatus(): Promise<TokenStatus> {
  const stored = await getStoredToken()
  if (!stored) {
    return {
      daysUntilExpiry: 0,
      isExpired: true,
      needsRefresh: false,
      severity: 'critical',
      hasWarning: false,
      warningMessage: 'Token não configurado',
    }
  }

  const daysUntilExpiry = Math.floor((stored.expiresAt.getTime() - Date.now()) / 86_400_000)
  const isExpired = daysUntilExpiry <= 0
  const needsRefresh = daysUntilExpiry <= TOKEN_REFRESH_THRESHOLD_DAYS && !isExpired
  // hasWarning preserva semantica original (<=7 dias) para callers existentes.
  const hasWarning = daysUntilExpiry <= TOKEN_EXPIRY_WARNING_DAYS && !isExpired
  const severity = computeTokenSeverity(daysUntilExpiry, isExpired)

  let warningMessage: string | null = null
  if (isExpired) {
    warningMessage = 'Token Instagram expirado. Reconectar conta no painel.'
  } else if (severity === 'critical') {
    warningMessage = `URGENTE: Token Instagram expira em ${daysUntilExpiry} dias. Refresh agora.`
  } else if (severity === 'warning') {
    warningMessage = `Token Instagram expira em ${daysUntilExpiry} dias. Refresh recomendado hoje.`
  } else if (severity === 'info') {
    warningMessage = `Token Instagram expira em ${daysUntilExpiry} dias. Agende o refresh.`
  }

  return {
    daysUntilExpiry: Math.max(0, daysUntilExpiry),
    isExpired,
    needsRefresh,
    severity,
    hasWarning,
    warningMessage,
  }
}
