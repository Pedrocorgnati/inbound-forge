import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession, ok, notFound, validationError, internalError } from '@/lib/api-auth'
import { GenerateUTMSchema } from '@/schemas/utm.schema'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://inbound-forge.vercel.app'

// POST /api/v1/utm/generate
export async function POST(request: NextRequest) {
  const { response } = await requireSession()
  if (response) return response

  let body: unknown
  try { body = await request.json() } catch { return validationError(new Error('Body inválido')) }

  const parsed = GenerateUTMSchema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error)

  try {
    const post = await prisma.post.findUnique({
      where: { id: parsed.data.postId },
      include: { contentPiece: { include: { theme: true } } },
    })
    if (!post) return notFound('Post não encontrado')
    if (!post.contentPiece) return notFound('Post sem ContentPiece associado')

    // Parâmetros UTM derivados do post
    const source = post.channel.toLowerCase()
    const medium = post.channel === 'BLOG' ? 'organic' : 'social'
    const campaign = post.contentPiece.theme.title
      .toLowerCase()
      .replace(/\s+/g, '-')
      .slice(0, 255)
    const content = post.id.slice(0, 8)

    const params = new URLSearchParams({ utm_source: source, utm_medium: medium, utm_campaign: campaign, utm_content: content })
    const fullUrl = `${BASE_URL}/blog?${params.toString()}`

    // Upsert UTMLink
    const existing = await prisma.uTMLink.findUnique({ where: { postId: parsed.data.postId } })

    let utmLink
    if (existing) {
      utmLink = existing
    } else {
      utmLink = await prisma.uTMLink.create({
        data: { postId: parsed.data.postId, source, medium, campaign, content, fullUrl },
      })

      // Atualizar trackingUrl no post
      await prisma.post.update({
        where: { id: parsed.data.postId },
        data: { trackingUrl: fullUrl },
      })
    }

    return ok(utmLink)
  } catch {
    return internalError()
  }
}
