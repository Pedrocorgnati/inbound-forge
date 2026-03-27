import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import crypto from 'crypto'

/**
 * Verifica sessão do operador via Supabase Auth (cookie).
 * Retorna o user ou lança resposta 401.
 */
export async function requireSession() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return { user: null, response: NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 }) }
  }

  return { user, response: null }
}

/**
 * Verifica token Bearer de worker (WORKER_AUTH_TOKEN).
 * Usa comparação constante-time para prevenir timing attacks.
 */
export function requireWorkerToken(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return false

  const token = authHeader.slice(7)
  const expected = process.env.WORKER_AUTH_TOKEN

  if (!expected || token.length !== expected.length) return false

  try {
    return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected))
  } catch {
    return false
  }
}

/**
 * Helper para respostas padronizadas
 */
export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status })
}

export function okPaginated<T>(data: T[], pagination: { page: number; limit: number; total: number }) {
  const totalPages = Math.ceil(pagination.total / pagination.limit)
  return NextResponse.json({
    success: true,
    data,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages,
      hasMore: pagination.page < totalPages,
    },
  })
}

export function notFound(message = 'Recurso não encontrado') {
  return NextResponse.json({ success: false, error: message }, { status: 404 })
}

export function badRequest(message: string) {
  return NextResponse.json({ success: false, error: message }, { status: 400 })
}

export function validationError(error: unknown) {
  const message = error instanceof Error ? error.message : 'Dados de entrada inválidos'
  return NextResponse.json({ success: false, error: message }, { status: 422 })
}

export function internalError(message = 'Erro interno. Tente novamente.') {
  return NextResponse.json({ success: false, error: message }, { status: 500 })
}

export function conflict(message: string) {
  return NextResponse.json({ success: false, error: message }, { status: 409 })
}
