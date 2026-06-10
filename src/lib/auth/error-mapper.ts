/**
 * Rastreabilidade: CL-253, TASK-8 ST003
 * Mapeia erros Supabase Auth para mensagens públicas seguras.
 * Em produção: NUNCA incluir stack trace ou detalhes internos no response.
 * Log completo vai para Sentry (TASK-1), não para o response.
 */
import { captureException } from '@/lib/sentry'

interface AuthErrorPayload {
  message: string
  code?: string
}

const SUPABASE_ERROR_MAP: Record<string, string> = {
  'Invalid login credentials': 'Email ou senha inválidos.',
  'Email not confirmed': 'Confirme seu email antes de fazer login.',
  'User not found': 'Email ou senha inválidos.',
  'Invalid password': 'Email ou senha inválidos.',
  'Password should be at least 6 characters': 'A senha deve ter no mínimo 6 caracteres.',
  'Email rate limit exceeded': 'Muitas tentativas. Tente novamente em alguns minutos.',
  'over_email_send_rate_limit': 'Muitas tentativas. Tente novamente em alguns minutos.',
  'session_not_found': 'Sessão expirada. Faça login novamente.',
}

const GENERIC_ERROR_MESSAGE = 'Ocorreu um erro. Tente novamente.'

/**
 * Transforma erro Supabase em mensagem pública segura.
 * Em produção: sem stack, sem detalhes internos.
 * Em dev: retorna mensagem detalhada para facilitar debug.
 */
export function mapAuthError(error: unknown, context?: string): AuthErrorPayload {
  const isProd = process.env.NODE_ENV === 'production'

  if (!isProd) {
    const msg = error instanceof Error ? error.message : String(error)
    return { message: msg }
  }

  if (error instanceof Error) {
    const known = SUPABASE_ERROR_MAP[error.message]
    if (known) return { message: known }

    for (const [key, mapped] of Object.entries(SUPABASE_ERROR_MAP)) {
      if (error.message.includes(key)) return { message: mapped }
    }

    captureException(error, { context: context ?? 'auth', original_message: error.message })
  }

  return { message: GENERIC_ERROR_MESSAGE }
}

/**
 * Retorna resposta JSON segura para erros de auth.
 * Nunca expõe stack trace em produção.
 */
export function authErrorResponse(error: unknown, context?: string): { error: string } {
  const { message } = mapAuthError(error, context)
  return { error: message }
}
