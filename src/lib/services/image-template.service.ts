// module-9: TASK-5 ST001 — ImageTemplate Service
// Rastreabilidade: TASK-5 ST001, INT-060, FEAT-creative-generation-001
//
// Note: Prisma ImageTemplate model uses width/height (not widthPx/heightPx).
// The Zod validators use widthPx/heightPx for semantic clarity; mapping happens here.

import { prisma }  from '@/lib/prisma'
import { Prisma }  from '@prisma/client'
import type { ImageTemplate } from '@prisma/client'
import type { CreateTemplateDto, UpdateTemplateDto } from '@/lib/validators/image-template'
import { createTemplateSchema } from '@/lib/validators/image-template'

interface SeedTemplate {
  name:         string
  templateType: string
  channel:      string
  width:        number
  height:       number
}

const DEFAULT_TEMPLATES: SeedTemplate[] = [
  { name: 'Carrossel Instagram',      templateType: 'CAROUSEL',         channel: 'instagram', width: 1080, height: 1080 },
  { name: 'Post Landscape LinkedIn',  templateType: 'STATIC_LANDSCAPE', channel: 'linkedin',  width: 1200, height: 630  },
  { name: 'Post Retrato Instagram',   templateType: 'STATIC_PORTRAIT',  channel: 'instagram', width: 1080, height: 1350 },
  { name: 'Capa de Vídeo',            templateType: 'VIDEO_COVER',       channel: 'instagram', width: 1080, height: 1080 },
  { name: 'Antes e Depois',           templateType: 'BEFORE_AFTER',      channel: 'instagram', width: 1080, height: 1350 },
  { name: 'Card de Erro',             templateType: 'ERROR_CARD',        channel: 'instagram', width: 1080, height: 1350 },
  { name: 'Card de Solução',          templateType: 'SOLUTION_CARD',     channel: 'linkedin',  width: 1200, height: 630  },
  { name: 'Bastidores',               templateType: 'BACKSTAGE_CARD',    channel: 'instagram', width: 1080, height: 1080 },
]

export const imageTemplateService = {
  async list(channel?: string): Promise<ImageTemplate[]> {
    return prisma.imageTemplate.findMany({
      where: {
        isActive: true,
        ...(channel ? { channel } : {}),
      },
      orderBy: { createdAt: 'asc' },
    })
  },

  async findById(id: string): Promise<ImageTemplate | null> {
    return prisma.imageTemplate.findUnique({ where: { id } })
  },

  async create(dto: CreateTemplateDto): Promise<ImageTemplate> {
    const parsed = createTemplateSchema.parse(dto)
    return prisma.imageTemplate.create({
      data: {
        name:         parsed.name,
        templateType: parsed.templateType,
        channel:      parsed.channel,
        width:        parsed.widthPx,
        height:       parsed.heightPx,
        configJson:   parsed.configJson !== undefined
          ? (parsed.configJson as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        isActive:     parsed.isActive ?? true,
      },
    })
  },

  async update(id: string, dto: UpdateTemplateDto): Promise<ImageTemplate> {
    return prisma.imageTemplate.update({
      where: { id },
      data:  {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.configJson !== undefined
          ? { configJson: dto.configJson as Prisma.InputJsonValue }
          : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    })
  },

  /**
   * Soft delete — sets isActive=false.
   */
  async softDelete(id: string): Promise<ImageTemplate> {
    return prisma.imageTemplate.update({
      where: { id },
      data:  { isActive: false },
    })
  },

  /**
   * Seed the 8 default templates.
   * Idempotent — skips templates that already exist by name.
   * Returns count of actually created records.
   */
  async seed(): Promise<number> {
    let created = 0
    for (const tpl of DEFAULT_TEMPLATES) {
      const existing = await prisma.imageTemplate.findFirst({ where: { name: tpl.name } })
      if (!existing) {
        await prisma.imageTemplate.create({
          data: {
            name:         tpl.name,
            templateType: tpl.templateType,
            channel:      tpl.channel,
            width:        tpl.width,
            height:       tpl.height,
            isActive:     true,
          },
        })
        created++
      }
    }
    return created
  },
}
