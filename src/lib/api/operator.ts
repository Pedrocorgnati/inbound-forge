/**
 * TAREFA-018: Resolucao do operador para canais SSE.
 *
 * Deriva o `operatorId` da sessao Supabase real (`requireSession`), em vez de um
 * header arbitrario. Retorna `null` quando nao ha sessao valida; o route
 * traduz `null` em 401 (Zero Silencio: nunca abre um stream anonimo).
 *
 * `operatorId` aqui e o `user.id` do Supabase Auth — a mesma identidade usada
 * pelo restante das rotas autenticadas. O parametro `request` e aceito por
 * compatibilidade de assinatura com os route handlers, mas a resolucao usa o
 * cookie de sessao (lido por `requireSession`), nao o request diretamente.
 */
import type { NextRequest } from 'next/server'
import { requireSession } from '@/lib/api-auth'

export async function resolveOperatorId(
  _request?: NextRequest,
): Promise<string | null> {
  const { user } = await requireSession()
  return user?.id ?? null
}
