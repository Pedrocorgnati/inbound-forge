/**
 * Seed ImageTemplate (8 canais oficiais) — Intake Review TASK-3 ST004
 *
 * Cria/atualiza uma linha ImageTemplate por canal oficial, garantindo que
 * `width/height` espelham a fonte unica em `workers/image-worker/src/templates/dimensions.ts`.
 *
 * Idempotente via upsert por `id` canonical (`mvp-<channel>`).
 *
 * Uso:
 *   ts-node --compiler-options {"module":"CommonJS"} prisma/seed-image-templates.ts
 */
import { PrismaClient } from '@prisma/client'
import { ImageType } from '@prisma/client'
import { TEMPLATE_DIMENSIONS } from '../src/lib/image-dimensions'

interface TemplateSeed {
  id: string
  imageType: ImageType
  templateType: string
  name: string
  channel: string
  width: number
  height: number
  description: string
  backgroundNeedsText: boolean
}

const TEMPLATES: TemplateSeed[] = [
  {
    id: 'mvp-og-blog',
    imageType: 'STATIC_LANDSCAPE',
    templateType: 'STATIC_LANDSCAPE',
    name: 'OG/Blog Cover — 1200x630',
    channel: 'blog',
    width: TEMPLATE_DIMENSIONS.OG_BLOG.w,
    height: TEMPLATE_DIMENSIONS.OG_BLOG.h,
    description: 'Cover oficial para Open Graph (Blog, LinkedIn link preview, Twitter).',
    backgroundNeedsText: false,
  },
  {
    id: 'mvp-solution-card',
    imageType: 'SOLUTION_CARD',
    templateType: 'SOLUTION_CARD',
    name: 'Solution Card — 1200x630',
    channel: 'blog',
    width: TEMPLATE_DIMENSIONS.OG_BLOG.w,
    height: TEMPLATE_DIMENSIONS.OG_BLOG.h,
    description: 'Card de solucao proposta ao lead, em ratio OG.',
    backgroundNeedsText: false,
  },
  {
    id: 'mvp-instagram-feed',
    imageType: 'STATIC_PORTRAIT',
    templateType: 'STATIC_PORTRAIT',
    name: 'Instagram Feed Portrait — 1080x1350',
    channel: 'instagram',
    width: TEMPLATE_DIMENSIONS.INSTAGRAM_FEED.w,
    height: TEMPLATE_DIMENSIONS.INSTAGRAM_FEED.h,
    description: 'Feed 4:5 oficial do Instagram — ocupa maior area vertical no feed.',
    backgroundNeedsText: false,
  },
  {
    id: 'mvp-before-after',
    imageType: 'BEFORE_AFTER',
    templateType: 'BEFORE_AFTER',
    name: 'Before/After Instagram — 1080x1350',
    channel: 'instagram',
    width: TEMPLATE_DIMENSIONS.INSTAGRAM_FEED.w,
    height: TEMPLATE_DIMENSIONS.INSTAGRAM_FEED.h,
    description: 'Frame comparativo Antes/Depois para Instagram.',
    backgroundNeedsText: false,
  },
  {
    id: 'mvp-error-card',
    imageType: 'ERROR_CARD',
    templateType: 'ERROR_CARD',
    name: 'Error Card Instagram — 1080x1350',
    channel: 'instagram',
    width: TEMPLATE_DIMENSIONS.INSTAGRAM_FEED.w,
    height: TEMPLATE_DIMENSIONS.INSTAGRAM_FEED.h,
    description: 'Card de diagnostico de erro/dor para Instagram.',
    backgroundNeedsText: false,
  },
  {
    id: 'mvp-instagram-square',
    imageType: 'CAROUSEL',
    templateType: 'CAROUSEL',
    name: 'Instagram Carousel Square — 1080x1080',
    channel: 'instagram',
    width: TEMPLATE_DIMENSIONS.INSTAGRAM_SQUARE.w,
    height: TEMPLATE_DIMENSIONS.INSTAGRAM_SQUARE.h,
    description: 'Slides de carrossel em formato quadrado.',
    backgroundNeedsText: false,
  },
  {
    id: 'mvp-video-cover',
    imageType: 'VIDEO_COVER',
    templateType: 'VIDEO_COVER',
    name: 'Video Cover — 1080x1080',
    channel: 'instagram',
    width: TEMPLATE_DIMENSIONS.VIDEO_COVER.w,
    height: TEMPLATE_DIMENSIONS.VIDEO_COVER.h,
    description: 'Thumbnail square para Reels/YouTube.',
    backgroundNeedsText: false,
  },
  {
    id: 'mvp-backstage',
    imageType: 'BACKSTAGE_CARD',
    templateType: 'BACKSTAGE_CARD',
    name: 'Backstage Card — 1080x1080',
    channel: 'instagram',
    width: TEMPLATE_DIMENSIONS.BACKSTAGE.w,
    height: TEMPLATE_DIMENSIONS.BACKSTAGE.h,
    description: 'Frame bastidor / meta do processo.',
    backgroundNeedsText: false,
  },
]

export async function seedImageTemplates(client: PrismaClient): Promise<{
  inserted: number
  updated: number
  total: number
}> {
  let inserted = 0
  let updated = 0
  for (const t of TEMPLATES) {
    const result = await client.imageTemplate.upsert({
      where: { id: t.id },
      update: {
        imageType: t.imageType,
        templateType: t.templateType,
        name: t.name,
        channel: t.channel,
        width: t.width,
        height: t.height,
        description: t.description,
        backgroundNeedsText: t.backgroundNeedsText,
        isActive: true,
      },
      create: {
        id: t.id,
        imageType: t.imageType,
        templateType: t.templateType,
        name: t.name,
        channel: t.channel,
        width: t.width,
        height: t.height,
        description: t.description,
        backgroundNeedsText: t.backgroundNeedsText,
        isActive: true,
      },
      select: { createdAt: true, updatedAt: true },
    })
    if (result.createdAt.getTime() === result.updatedAt.getTime()) inserted++
    else updated++
  }
  return { inserted, updated, total: TEMPLATES.length }
}

async function main() {
  const prisma = new PrismaClient()
  try {
    const { inserted, updated, total } = await seedImageTemplates(prisma)
    console.log(
      `[seed:image-templates] inseridos=${inserted} atualizados=${updated} total=${total}`
    )
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error('[seed:image-templates] falhou', err)
    process.exit(1)
  })
}
