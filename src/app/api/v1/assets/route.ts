import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession, ok, okPaginated, validationError, internalError } from '@/lib/api-auth'
import { uploadToBucket, sha256 } from '@/lib/storage/supabase-storage'
import { auditLog } from '@/lib/audit'
import { buildSearchWhere, sanitizeSearchTerm } from '@/lib/search/text-search'

// GET /api/v1/assets
// Intake-Review TASK-22 ST004 (CL-CG-037): ?search= em fileName/originalName + tags array.
export async function GET(request: NextRequest) {
  const { response } = await requireSession()
  if (response) return response

  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20')))
    const rawSearch = searchParams.get('search') ?? undefined

    const where: Record<string, unknown> = {}
    const searchWhere = buildSearchWhere(rawSearch, ['fileName', 'originalName'] as const)
    const term = sanitizeSearchTerm(rawSearch)
    if (term) {
      // Tag match via hasSome (split por whitespace, lowercase nao aplica em array; tags
      // ja armazenadas conforme entrada do usuario). Combina OR entre ILIKE e tags.
      const terms = term.split(/\s+/).filter((t) => t.length >= 2)
      const tagClause = terms.length > 0 ? { tags: { hasSome: terms } } : null
      where.OR = [
        ...(searchWhere?.OR ?? []),
        ...(tagClause ? [tagClause] : []),
      ]
    }

    const [data, total] = await Promise.all([
      prisma.visualAsset.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.visualAsset.count({ where }),
    ])

    return okPaginated(data, { page, limit, total })
  } catch {
    return internalError()
  }
}

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const
const MAX_BYTES = 10 * 1024 * 1024
const EXT_BY_MIME: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
}

// TASK-4 ST002 (CL-256): POST /api/v1/assets — upload multipart para bucket.
export async function POST(request: NextRequest) {
  const { user, response } = await requireSession()
  if (response) return response

  try {
    let formData: FormData
    try {
      formData = await request.formData()
    } catch {
      return validationError(new Error('Multipart inválido'))
    }

    const file = formData.get('file')
    if (!(file instanceof File)) {
      return validationError(new Error('Campo "file" obrigatório'))
    }

    if (!ACCEPTED_TYPES.includes(file.type as (typeof ACCEPTED_TYPES)[number])) {
      return validationError(new Error(`Tipo inválido: ${file.type}. Aceitos: png, jpg, webp`))
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'Arquivo maior que 10MB' }, { status: 413 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const contentHash = sha256(buffer)

    // Dedup: se ja existe, retorna asset existente
    const existing = await prisma.visualAsset.findFirst({ where: { fileName: `${contentHash}.${EXT_BY_MIME[file.type]}` } })
    if (existing) return ok({ id: existing.id, url: existing.storageUrl, contentHash, reused: true }, 200)

    const ext = EXT_BY_MIME[file.type]
    const fileName = `${contentHash}.${ext}`
    const path = `assets/${user!.id}/${fileName}`
    const uploaded = await uploadToBucket(buffer, path, file.type)

    const asset = await prisma.visualAsset.create({
      data: {
        fileName,
        originalName: file.name,
        fileType: file.type,
        fileSizeBytes: uploaded.size,
        storageUrl: uploaded.url,
      },
    })

    if (user?.id) {
      await auditLog({
        action: 'upload_asset',
        entityType: 'VisualAsset',
        entityId: asset.id,
        userId: user.id,
        metadata: { originalName: file.name, fileType: file.type, size: uploaded.size },
      }).catch(() => undefined)
    }

    return ok({ id: asset.id, url: asset.storageUrl, contentHash, reused: false }, 201)
  } catch {
    return internalError()
  }
}
