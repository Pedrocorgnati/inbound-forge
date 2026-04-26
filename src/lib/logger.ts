/**
 * Logger estruturado centralizado — Inbound Forge
 * Rastreabilidade: nextjs:scalability T004
 *
 * Wrapper sobre console.* que serializa saída em JSON (produção)
 * ou texto legível (desenvolvimento). Compatível com Vercel Logs e Railway.
 *
 * Inclui integração com log-sanitizer para remover PII nos campos de data.
 */
import { sanitizeForLog } from '@/lib/log-sanitizer'

type Level = 'info' | 'warn' | 'error' | 'debug'

const IS_PROD = process.env.NODE_ENV === 'production'

function log(level: Level, label: string, message: string, data?: object): void {
  const sanitized = data ? (sanitizeForLog(data) as object) : undefined
  if (IS_PROD) {
    const entry = {
      level,
      label,
      message,
      timestamp: new Date().toISOString(),
      ...(sanitized || {}),
    }
    const serialized = JSON.stringify(entry)
    if (level === 'error') console.error(serialized)
    else if (level === 'warn') console.warn(serialized)
    else console.log(serialized)
  } else {
    const prefix = `[${label}]`
    if (level === 'error') console.error(prefix, message, sanitized ?? '')
    else if (level === 'warn') console.warn(prefix, message, sanitized ?? '')
    else console.log(prefix, message, sanitized ?? '')
  }
}

export const logger = {
  info: (label: string, message: string, data?: object) => log('info', label, message, data),
  warn: (label: string, message: string, data?: object) => log('warn', label, message, data),
  error: (label: string, message: string, data?: object) => log('error', label, message, data),
  debug: (label: string, message: string, data?: object) => {
    if (!IS_PROD) log('debug', label, message, data)
  },
}
