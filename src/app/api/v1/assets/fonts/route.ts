// /api/v1/assets/fonts — GET lista, POST upload (TASK-13 ST002 / CL-105)

import { NextRequest, NextResponse } from 'next/server'
import { requireSession, ok, validationError, internalError } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { auditLog } from '@/lib/audit'

const ALLOWED_MIME = new Set([
  'font/ttf',
  'font/otf',
  'font/woff',
  'font/woff2',
  'application/font-woff',
  'application/octet-stream',
])
const MAX_BYTES = 5 * 1024 * 1024

export async function GET() {
  const { user, response } = await requireSession()
  if (response) return response
  try {
    const fonts = await prisma.customFont.findMany({
      where: { operatorId: user!.id },
      orderBy: { createdAt: 'desc' },
    })
    return ok({ fonts })
  } catch {
    return internalError()
  }
}

export async function POST(request: NextRequest) {
  const { user, response } = await requireSession()
  if (response) return response
  try {
    const form = await request.formData()
    const file = form.get('file')
    const family = String(form.get('family') ?? '').trim()
    const weightRaw = form.get('weight')
    const style = (String(form.get('style') ?? 'normal').trim() || 'normal') as string

    if (!(file instanceof File)) {
      return validationError(new Error('Campo file obrigatorio (multipart/form-data)'))
    }
    if (!family) return validationError(new Error('Campo family obrigatorio'))
    if (file.size === 0 || file.size > MAX_BYTES) {
      return validationError(new Error(`Arquivo deve ter entre 1 byte e ${MAX_BYTES} bytes`))
    }
    if (file.type && !ALLOWED_MIME.has(file.type)) {
      return validationError(new Error(`MIME nao permitido: ${file.type}`))
    }
    const weight = weightRaw ? Number(weightRaw) : 400
    if (!Number.isFinite(weight) || weight < 100 || weight > 900) {
      return validationError(new Error('weight deve estar entre 100 e 900'))
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const storagePath = `fonts/${user!.id}/${Date.now()}-${safeName}`

    // Nota: upload real para Supabase Storage acontece no worker — aqui registramos metadata.
    const created = await prisma.customFont.create({
      data: {
        operatorId: user!.id,
        family,
        weight,
        style,
        storagePath,
        fileSize: file.size,
      },
    })

    await auditLog({
      action: 'CUSTOM_FONT_UPLOADED',
      entityType: 'CustomFont',
      entityId: created.id,
      userId: user!.id,
      metadata: { family, weight, style, fileSize: file.size },
    }).catch(() => undefined)

    return NextResponse.json({ success: true, font: created })
  } catch {
    return internalError()
  }
}
