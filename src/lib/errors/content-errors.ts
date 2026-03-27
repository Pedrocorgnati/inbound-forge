/**
 * Content Error Codes e Helpers — Inbound Forge
 * Módulo: module-8-content-generation (TASK-0/ST005)
 *
 * Estende o sistema de erros existente com códigos de conteúdo.
 * Todos os erros retornam { error: { code, message } } sem expor stack traces.
 */
import { NextResponse } from 'next/server'
import type { ApiResponse } from '@/types/base'

// ─── Content Error Codes ──────────────────────────────────────────────────────

export const CONTENT_ERROR_CODES = {
  // Auth / Ownership (001-019)
  CONTENT_001: 'Acesso negado — você não tem permissão para este recurso',
  CONTENT_002: 'Recurso de conteúdo não encontrado',

  // Business Rules (050-079)
  CONTENT_050: 'Operação inválida no estado atual do conteúdo',
  CONTENT_051: 'Adicione ao menos uma dor ou case de sucesso ao tema antes de gerar ângulos',
  CONTENT_052: 'Serviço Claude retornou erro — tente novamente em instantes',
  CONTENT_053: 'Resposta da IA em formato inválido — tente novamente',
  CONTENT_060: 'ContentPiece já aprovado',
  CONTENT_061: 'Ângulo não selecionado para aprovação',
  CONTENT_062: 'Motivo de rejeição deve ter no mínimo 10 caracteres',
  CONTENT_063: 'Falha na análise de padrões de rejeição',

  // Rate Limiting (070-079)
  CONTENT_070: 'Limite de adaptações por dia atingido',
  CONTENT_071: 'Serviço de adaptação temporariamente indisponível',
  CONTENT_072: 'Body adaptado truncado para caber no limite do canal',

  // Content Editor (080-099)
  CONTENT_080: 'Conteúdo não encontrado para este tema',
  CONTENT_090: 'Ângulo não encontrado',
  CONTENT_091: 'Versão não encontrada',
  CONTENT_092: 'Não é possível restaurar a versão atual',

  // System (SYS)
  SYS_001: 'Serviço Claude temporariamente indisponível',
  DB_002: 'Falha na transação. Tente novamente.',
} as const

export type ContentErrorCode = keyof typeof CONTENT_ERROR_CODES

// ─── Error Builder ────────────────────────────────────────────────────────────

export function buildContentError(
  code: ContentErrorCode,
  httpStatus: number,
  extra?: Record<string, unknown>
): NextResponse<ApiResponse<never>> {
  return NextResponse.json<ApiResponse<never>>(
    {
      success: false,
      error: {
        code,
        message: CONTENT_ERROR_CODES[code],
        ...extra,
      },
    },
    { status: httpStatus }
  )
}

// ─── Error Classes ────────────────────────────────────────────────────────────

export class ContentOwnershipError extends Error {
  readonly code = 'CONTENT_001'
  constructor(context?: string) {
    super(context ? `Acesso negado (${context})` : 'Acesso negado')
    this.name = 'ContentOwnershipError'
  }
}

export class ContentNotFoundError extends Error {
  readonly code = 'CONTENT_002'
  constructor(resource?: string) {
    super(resource ? `${resource} não encontrado` : 'Recurso não encontrado')
    this.name = 'ContentNotFoundError'
  }
}

export class ContentBusinessRuleError extends Error {
  readonly code: ContentErrorCode
  constructor(code: ContentErrorCode, message?: string) {
    super(message ?? CONTENT_ERROR_CODES[code])
    this.name = 'ContentBusinessRuleError'
    this.code = code
  }
}

// ─── Ownership Middleware Helpers ─────────────────────────────────────────────

/**
 * Verifica que o ContentPiece pertence ao tema informado.
 * Em Inbound Forge é single-operator, então basta verificar que o tema existe e está ativo.
 */
export async function assertContentExists(
  prisma: { contentPiece: { findUnique: (args: unknown) => Promise<unknown> } },
  contentPieceId: string
): Promise<{ id: string; themeId: string; status: string }> {
  const piece = await prisma.contentPiece.findUnique({
    where: { id: contentPieceId },
    select: { id: true, themeId: true, status: true },
  })

  if (!piece) {
    throw new ContentNotFoundError('ContentPiece')
  }

  return piece as { id: string; themeId: string; status: string }
}

/**
 * Verifica que o tema pertence ao sistema e está acessível.
 * Inbound Forge é single-operator — qualquer sessão autenticada tem acesso.
 */
export async function assertThemeExists(
  prisma: { theme: { findUnique: (args: unknown) => Promise<unknown> } },
  themeId: string
): Promise<{ id: string; title: string; status: string; conversionScore: number }> {
  const theme = await prisma.theme.findUnique({
    where: { id: themeId },
    select: { id: true, title: true, status: true, conversionScore: true },
  })

  if (!theme) {
    throw new ContentNotFoundError('Tema')
  }

  return theme as { id: string; title: string; status: string; conversionScore: number }
}
