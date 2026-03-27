import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession, okPaginated, validationError, internalError } from '@/lib/api-auth'

// GET /api/v1/assets
export async function GET(request: NextRequest) {
  const { response } = await requireSession()
  if (response) return response

  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20')))

    const [data, total] = await Promise.all([
      prisma.visualAsset.findMany({ orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      prisma.visualAsset.count(),
    ])

    return okPaginated(data, { page, limit, total })
  } catch {
    return internalError()
  }
}

// POST /api/v1/assets — upload de asset visual
export async function POST(_request: NextRequest) {
  const { response } = await requireSession()
  if (response) return response

  try {
    // TODO: Implementar via /auto-flow execute — upload para Supabase Storage
    // 1. Parse multipart/form-data
    // 2. Upload para Supabase Storage
    // 3. Criar VisualAsset com storageUrl
    return validationError(new Error('Upload de assets não implementado. Execute /auto-flow execute.'))
  } catch {
    return internalError()
  }
}
