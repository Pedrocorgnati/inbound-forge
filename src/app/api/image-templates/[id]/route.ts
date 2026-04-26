/**
 * GET    /api/image-templates/[id] — Buscar template por id
 * PUT    /api/image-templates/[id] — Atualizar template
 * DELETE /api/image-templates/[id] — Soft delete (isActive=false)
 *
 * Módulo: module-9-image-worker (TASK-5 ST002)
 * Rastreabilidade: TASK-5 ST001 ST002, INT-060, API-001
 */

import { type NextRequest, NextResponse } from 'next/server'
import { requireSession, validationError } from '@/lib/api-auth'
import { imageTemplateService }           from '@/lib/services/image-template.service'
import { updateTemplateSchema }           from '@/lib/validators/image-template'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { response: authResponse } = await requireSession()
  if (authResponse) return authResponse

  const template = await imageTemplateService.findById(id)
  if (!template) {
    return NextResponse.json({ error: 'Template não encontrado' }, { status: 404 })
  }

  return NextResponse.json(template)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { response: authResponse } = await requireSession()
  if (authResponse) return authResponse

  const template = await imageTemplateService.findById(id)
  if (!template) {
    return NextResponse.json({ error: 'Template não encontrado' }, { status: 404 })
  }

  // RESOLVED: G007 — safeParse para retornar 422 em vez de 500 para input inválido
  let body: unknown
  try { body = await request.json() } catch { return validationError(new Error('Body inválido')) }

  const parsed = updateTemplateSchema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error)

  const updated = await imageTemplateService.update(id, parsed.data)
  return NextResponse.json(updated)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { response: authResponse } = await requireSession()
  if (authResponse) return authResponse

  const template = await imageTemplateService.findById(id)
  if (!template) {
    return NextResponse.json({ error: 'Template não encontrado' }, { status: 404 })
  }

  await imageTemplateService.softDelete(id)
  return NextResponse.json({ success: true })
}
