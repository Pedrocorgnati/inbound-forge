import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession, notFound, validationError, internalError } from '@/lib/api-auth'
import { GenerateContentSchema } from '@/schemas/content.schema'

// POST /api/v1/content/generate
export async function POST(request: NextRequest) {
  const { response } = await requireSession()
  if (response) return response

  let body: unknown
  try { body = await request.json() } catch { return validationError(new Error('Body inválido')) }

  const parsed = GenerateContentSchema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error)

  try {
    const theme = await prisma.theme.findUnique({ where: { id: parsed.data.themeId } })
    if (!theme) return notFound('Tema não encontrado')

    // TODO: Implementar via /auto-flow execute — chamar Claude API para gerar 3 ângulos
    // 1. Criar ContentPiece com status DRAFT
    // 2. Gerar AGGRESSIVE, CONSULTIVE, AUTHORIAL via Claude (paralelo)
    // 3. Criar ContentAngleVariant para cada ângulo
    // 4. Atualizar ContentPiece status para REVIEW
    return NextResponse.json(
      { success: false, error: 'Geração de conteúdo não implementada. Execute /auto-flow execute.' },
      { status: 501 }
    )
  } catch {
    return internalError()
  }
}
