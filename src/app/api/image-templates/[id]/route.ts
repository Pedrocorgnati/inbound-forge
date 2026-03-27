/**
 * GET    /api/image-templates/[id] — Buscar template por id
 * PUT    /api/image-templates/[id] — Atualizar template
 * DELETE /api/image-templates/[id] — Soft delete (isActive=false)
 *
 * Módulo: module-9-image-worker (TASK-5 ST002)
 * Rastreabilidade: TASK-5 ST001 ST002, INT-060, API-001
 */

import { type NextRequest, NextResponse } from 'next/server'
import { requireSession }                 from '@/lib/api-auth'
import { imageTemplateService }           from '@/lib/services/image-template.service'
import { updateTemplateSchema }           from '@/lib/validators/image-template'
import { ZodError }                       from 'zod'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { response: authResponse } = await requireSession()
  if (authResponse) return authResponse

  const template = await imageTemplateService.findById(params.id)
  if (!template) {
    return NextResponse.json({ error: 'Template não encontrado' }, { status: 404 })
  }

  return NextResponse.json(template)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { response: authResponse } = await requireSession()
  if (authResponse) return authResponse

  const template = await imageTemplateService.findById(params.id)
  if (!template) {
    return NextResponse.json({ error: 'Template não encontrado' }, { status: 404 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 })
  }

  let dto: ReturnType<typeof updateTemplateSchema.parse>
  try {
    dto = updateTemplateSchema.parse(body)
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: err.errors[0]?.message ?? 'Dados inválidos' }, { status: 400 })
    }
    throw err
  }

  const updated = await imageTemplateService.update(params.id, dto)
  return NextResponse.json(updated)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { response: authResponse } = await requireSession()
  if (authResponse) return authResponse

  const template = await imageTemplateService.findById(params.id)
  if (!template) {
    return NextResponse.json({ error: 'Template não encontrado' }, { status: 404 })
  }

  await imageTemplateService.softDelete(params.id)
  return NextResponse.json({ success: true })
}
