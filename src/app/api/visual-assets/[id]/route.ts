/**
 * GET    /api/visual-assets/[id] — Buscar asset por ID
 * PUT    /api/visual-assets/[id] — Atualizar metadados (altText, tags)
 * PATCH  /api/visual-assets/[id] — Atualizar metadados parcialmente (CL-317 / TASK-7 ST002)
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
import { auditLog, AUDIT_ACTIONS } from '@/lib/audit'

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

// ─── Lógica interna de update (shared entre PUT e PATCH) ──────────────────────

async function handleUpdate(request: NextRequest, { params }: Params) {
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
    // CL-317 / TASK-7 ST003 — AuditLog de update
    await auditLog({
      action: AUDIT_ACTIONS.ASSET_UPDATE,
      entityType: 'visual_asset',
      entityId: id,
      userId: user!.id,
      metadata: { fields: Object.keys(parsed.data) },
    })
    return ok(updated)
  } catch (err) {
    console.error('[PUT/PATCH /api/visual-assets/:id] Erro:', err)
    return internalError()
  }
}

// ─── PUT /api/visual-assets/[id] ──────────────────────────────────────────────
export async function PUT(request: NextRequest, ctx: Params) {
  return handleUpdate(request, ctx)
}

// ─── PATCH /api/visual-assets/[id] ────────────────────────────────────────────
// CL-317 (TASK-7 ST002): alias para PUT — UI pode chamar PATCH; comportamento idêntico.
export async function PATCH(request: NextRequest, ctx: Params) {
  return handleUpdate(request, ctx)
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
    // TASK-7 ST003 — AuditLog de delete
    await auditLog({
      action: AUDIT_ACTIONS.ASSET_DELETE,
      entityType: 'visual_asset',
      entityId: id,
      userId: user!.id,
    })
    return ok({ success: true })
  } catch (err) {
    console.error('[DELETE /api/visual-assets/:id] Erro:', err)
    return NextResponse.json(
      { error: { code: 'SYS_001', message: 'Erro ao remover asset. Tente novamente.' } },
      { status: 500 }
    )
  }
}
