/**
 * LinkedIn Assisted Handler — prepara payload para copy manual do operador.
 * Intake Review TASK-9 ST002 (CL-077).
 *
 * Assistido: o sistema nao publica via OAuth; gera texto + URL com UTM para
 * o operador colar no LinkedIn. Registra PublishingQueue com status pausado
 * aguardando copy manual.
 */
import { prisma } from '@/lib/prisma'
import { buildCtaUrl } from '@/lib/utm-builder'

export interface LinkedinAssistedPayload {
  postId: string
  copy: string
  ctaUrl: string | null
  imageUrl: string | null
  hashtags: string[]
}

export async function prepareLinkedinPost(pieceId: string): Promise<LinkedinAssistedPayload> {
  const piece = await prisma.contentPiece.findUnique({ where: { id: pieceId } })
  if (!piece) throw new Error(`ContentPiece ${pieceId} nao encontrado`)

  const post = await prisma.post.findFirst({
    where: { contentPieceId: pieceId, channel: 'LINKEDIN' },
    orderBy: { createdAt: 'desc' },
  })
  if (!post) throw new Error('Nenhum Post LINKEDIN associado ao ContentPiece')

  const hashtags = post.hashtags ?? []
  const copyParts: string[] = []
  if (post.caption) copyParts.push(post.caption)
  if (post.cta) copyParts.push('', post.cta)
  if (hashtags.length) copyParts.push('', hashtags.map((h) => (h.startsWith('#') ? h : `#${h}`)).join(' '))

  let ctaUrl: string | null = post.ctaUrl ?? null
  if (ctaUrl && post.themeId) {
    try {
      ctaUrl = buildCtaUrl('CTA_CUSTOM', {
        baseUrl: ctaUrl,
        utmSource: 'linkedin',
        utmMedium: 'social_assisted',
        utmCampaign: post.themeId,
        utmContent: post.id,
      })
    } catch {
      /* mantem ctaUrl original se algo falhar */
    }
  }

  return {
    postId: post.id,
    copy: copyParts.join('\n'),
    ctaUrl,
    imageUrl: post.imageUrl ?? null,
    hashtags,
  }
}
