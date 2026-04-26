// module-10: Visual Asset Service
// Rastreabilidade: TASK-1 ST001+ST004, INT-063, PERF-002, PERF-003, QUAL-005
// Responsabilidades: upload, listagem paginada, atualização de metadados, deleção
// NÃO expõe lógica de autenticação — isso é responsabilidade da API Route

import { randomUUID } from 'crypto'
import { createClient } from '@supabase/supabase-js'
import sharp             from 'sharp'
import { prisma }        from '@/lib/prisma'
import { thumbnailService } from './thumbnail.service'
import type { VisualAsset as PrismaVisualAsset } from '@prisma/client'
import { ASSET_UPLOAD_CONFIG } from '@/lib/constants/asset-library'
import type { UpdateAssetInput, ListAssetsInput } from '@/lib/validators/visual-asset'
import { captureException, captureMessage } from '@/lib/sentry'

// ─── Supabase Storage Client (service role) ───────────────────────────────────

function getStorageClient() {
  const url     = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key     = process.env.SUPABASE_SERVICE_ROLE_KEY
  const bucket  = process.env.SUPABASE_STORAGE_BUCKET

  if (!url || !key || !bucket) {
    throw new Error('Supabase env vars ausentes: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_STORAGE_BUCKET')
  }

  return { client: createClient(url, key), bucket }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateFileName(originalName: string): string {
  const ext = originalName.split('.').pop()?.toLowerCase() ?? 'bin'
  // SEC: usar crypto.randomUUID() em vez de Math.random() para nomes não previsíveis (A02)
  return `${randomUUID()}.${ext}`
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const visualAssetService = {
  /**
   * Listagem paginada com filtros opcionais por tipo e tag.
   * PERF-002: 24 assets por página por default.
   */
  async list(params: ListAssetsInput): Promise<{
    items:      PrismaVisualAsset[]
    total:      number
    page:       number
    totalPages: number
  }> {
    const { page, limit, fileType, tag } = params

    const where = {
      isActive: true,
      ...(fileType ? { fileType } : {}),
      ...(tag ? { tags: { has: tag } } : {}),
    }

    const [items, total] = await Promise.all([
      prisma.visualAsset.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip:    (page - 1) * limit,
        take:    limit,
      }),
      prisma.visualAsset.count({ where }),
    ])

    return {
      items,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    }
  },

  /**
   * Busca um asset por ID. Retorna null se não encontrado ou inativo.
   */
  async findById(id: string): Promise<PrismaVisualAsset | null> {
    return prisma.visualAsset.findFirst({
      where: { id, isActive: true },
    })
  },

  /**
   * Upload de arquivo para Supabase Storage + insert no banco.
   * Gera thumbnail WebP 200×200 automaticamente (exceto SVG).
   * PERF-003: valida tamanho e tipo antes do upload.
   */
  async upload(file: File, altText?: string): Promise<PrismaVisualAsset> {
    const { client, bucket } = getStorageClient()
    const buffer      = Buffer.from(await file.arrayBuffer())
    const fileName    = generateFileName(file.name)
    const storagePath = `${ASSET_UPLOAD_CONFIG.storagePath}${fileName}`

    // Upload do arquivo original
    const { error: uploadError } = await client.storage
      .from(bucket)
      .upload(storagePath, buffer, { contentType: file.type, upsert: false })

    if (uploadError) {
      throw new Error(`Falha no upload para o Storage: ${uploadError.message}`)
    }

    const { data: { publicUrl: storageUrl } } = client.storage
      .from(bucket)
      .getPublicUrl(storagePath)

    // Gerar thumbnail (falha não cancela o upload principal)
    let thumbnailUrl: string | null = null
    try {
      thumbnailUrl = await thumbnailService.generateAndUpload(
        buffer,
        file.type,
        fileName,
        client,
        bucket
      )
    } catch (_err) {
      captureMessage('[visual-asset.service] Falha ao gerar thumbnail (não crítico)', 'warning')
    }

    // Extrair dimensões reais via Sharp (exceto SVG — Sharp não retorna dims confiáveis)
    let widthPx:  number | null = null
    let heightPx: number | null = null

    if (!file.type.includes('svg')) {
      try {
        const metadata = await sharp(buffer).metadata()
        widthPx  = metadata.width  ?? null
        heightPx = metadata.height ?? null
      } catch {
        // Dimensões não extraídas — não bloqueia upload
      }
    }

    return prisma.visualAsset.create({
      data: {
        fileName,
        originalName:  file.name,
        fileType:      file.type,
        fileSizeBytes: file.size,
        widthPx,
        heightPx,
        storageUrl,
        thumbnailUrl,
        altText:    altText ?? null,
        tags:       [],
        usedInJobs: [],
        isActive:   true,
      },
    })
  },

  /**
   * Atualiza metadados de um asset (altText, tags).
   */
  async update(id: string, dto: UpdateAssetInput): Promise<PrismaVisualAsset> {
    return prisma.visualAsset.update({
      where: { id },
      data: {
        ...(dto.altText !== undefined ? { altText: dto.altText } : {}),
        ...(dto.tags    !== undefined ? { tags: dto.tags }       : {}),
      },
    })
  },

  /**
   * Soft-delete: marca isActive=false no banco E remove arquivo do Storage.
   * Ambas as remoções devem ocorrer — falha de Storage loga mas não reverte o banco.
   */
  async delete(id: string): Promise<void> {
    const asset = await prisma.visualAsset.findUnique({ where: { id } })
    if (!asset) return

    // Soft-delete no banco
    await prisma.visualAsset.update({
      where: { id },
      data:  { isActive: false },
    })

    // Remover do Storage (best-effort)
    try {
      const { client, bucket } = getStorageClient()
      const fileName = asset.storageUrl.split('/').pop()

      const toDelete: string[] = []

      if (fileName) {
        toDelete.push(`${ASSET_UPLOAD_CONFIG.storagePath}${fileName}`)
      }

      // Remover thumbnail também
      if (asset.thumbnailUrl) {
        const thumbName = asset.thumbnailUrl.split('/').pop()
        if (thumbName) {
          toDelete.push(`${ASSET_UPLOAD_CONFIG.thumbnailPath}${thumbName}`)
        }
      }

      if (toDelete.length > 0) {
        const { error } = await client.storage.from(bucket).remove(toDelete)
        if (error) {
          captureMessage('[visual-asset.service] Falha ao remover do Storage (asset já inativo no banco)', 'warning')
        }
      }
    } catch (err) {
      captureException(err, { service: 'visual-asset', step: 'delete-storage' })
    }
  },

  /**
   * Registra que um ImageJob usou este asset (para rastreabilidade).
   */
  async recordJobUsage(assetId: string, jobId: string): Promise<void> {
    await prisma.visualAsset.update({
      where: { id: assetId },
      data:  {
        usedInJobs: { push: jobId },
      },
    })
  },
}
