/**
 * GET  /api/image-templates — Listar templates (filtro ?channel=instagram)
 * POST /api/image-templates — Criar novo template
 *
 * Módulo: module-9-image-worker (TASK-5 ST002)
 * Rastreabilidade: TASK-5 ST001 ST002, INT-060, API-001
 */

import { type NextRequest, NextResponse } from 'next/server'
import { requireSession }                 from '@/lib/api-auth'
import { imageTemplateService }           from '@/lib/services/image-template.service'
import { createTemplateSchema }           from '@/lib/validators/image-template'
import { ZodError }                       from 'zod'

export async function GET(request: NextRequest) {
  const { response: authResponse } = await requireSession()
  if (authResponse) return authResponse

  try {
    const channel = request.nextUrl.searchParams.get('channel') ?? undefined
    const templates = await imageTemplateService.list(channel)
    return NextResponse.json(templates)
  } catch (err) {
    console.error('[image-templates] GET error:', err)
    return NextResponse.json(
      { error: { code: 'IMAGE_060', message: 'Erro ao listar templates de imagem.' } },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const { response: authResponse } = await requireSession()
  if (authResponse) return authResponse

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 })
  }

  let dto: ReturnType<typeof createTemplateSchema.parse>
  try {
    dto = createTemplateSchema.parse(body)
  } catch (err) {
    if (err instanceof ZodError) {
      const message = err.errors[0]?.message ?? 'Dados inválidos'
      return NextResponse.json(
        { error: { code: 'IMAGE_061', message } },
        { status: 400 }
      )
    }
    throw err
  }

  try {
    const template = await imageTemplateService.create(dto)
    return NextResponse.json(template, { status: 201 })
  } catch (err) {
    console.error('[image-templates] POST error:', err)
    return NextResponse.json(
      { error: { code: 'IMAGE_062', message: 'Erro ao criar template de imagem.' } },
      { status: 500 }
    )
  }
}
