/**
 * GET    /api/visual-assets/[id] — Buscar asset por ID
 * PUT    /api/visual-assets/[id] — Atualizar metadados (altText, tags)
 * DELETE /api/visual-assets/[id] — Remover asset (banco + Storage)
 *
 * Módulo: module-10-asset-library (TASK-1 ST001)
 * Rastreabilidade: INT-063, QUAL-005
 * Error Catalog: VAL_001 (400), SYS_001 (500), AUTH_001 (401)
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireSession, ok, notFound, validationError, internalError } from '@/lib/api-auth'
import { visualAssetService } from '@/lib/services/visual-asset.service'
import { updateAssetSchema } from '@/lib/validators/visual-asset'

interface Params {
  params: Promise<{ id: string }>
}

// ─── GET /api/visual-assets/[id] ──────────────────────────────────────────────

export async function GET(_request: NextRequest, { params }: Params) {
  const { user, response: authResponse } = await requireSession()
  if (authResponse) return authResponse

  const { id } = await params

  const asset = await visualAssetService.findById(id, user!.id)
  if (!asset) {
    return notFound('Asset não encontrado.')
  }

  return ok(asset)
}

// ─── PUT /api/visual-assets/[id] ──────────────────────────────────────────────

export async function PUT(request: NextRequest, { params }: Params) {
  const { user, response: authResponse } = await requireSession()
  if (authResponse) return authResponse

  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return validationError('Corpo JSON inválido')
  }

  const parsed = updateAssetSchema.safeParse(body)
  if (!parsed.success) {
    return validationError(parsed.error)
  }

  const existing = await visualAssetService.findById(id, user!.id)
  if (!existing) {
    return notFound('Asset não encontrado.')
  }

  try {
    const updated = await visualAssetService.update(id, parsed.data)
    return ok(updated)
  } catch (err) {
    console.error('[PUT /api/visual-assets/:id] Erro:', err)
    return internalError()
  }
}

// ─── DELETE /api/visual-assets/[id] ───────────────────────────────────────────

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { user, response: authResponse } = await requireSession()
  if (authResponse) return authResponse

  const { id } = await params

  const existing = await visualAssetService.findById(id, user!.id)
  if (!existing) {
    return notFound('Asset não encontrado.')
  }

  try {
    await visualAssetService.delete(id)
    return ok({ success: true })
  } catch (err) {
    console.error('[DELETE /api/visual-assets/:id] Erro:', err)
    return NextResponse.json(
      { error: { code: 'SYS_001', message: 'Erro ao remover asset. Tente novamente.' } },
      { status: 500 }
    )
  }
}
