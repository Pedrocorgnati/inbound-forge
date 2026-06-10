/**
 * Rastreabilidade: CL-298, TASK-2 ST003
 * Worker assíncrono de export LGPD.
 * Chamado por background job (Railway/Vercel background function).
 * Gera JSON, faz upload ao Supabase Storage (signed URL 24h), atualiza DataExportRequest.
 */
import { prisma } from '@/lib/prisma'
import { buildLgpdExport } from '@/lib/lgpd/export-builder'
import { createClient as createSupabaseServer } from '@/lib/supabase-server'

const TTL_SECONDS = 24 * 3600
const BUCKET = 'lgpd-exports'

export async function processLgpdExport(requestId: string): Promise<void> {
  await prisma.dataExportRequest.update({
    where: { id: requestId },
    data: { status: 'processing' },
  })

  let operatorId: string
  try {
    const req = await prisma.dataExportRequest.findUniqueOrThrow({ where: { id: requestId } })
    operatorId = req.operatorId
  } catch {
    await prisma.dataExportRequest.update({
      where: { id: requestId },
      data: { status: 'failed' },
    })
    return
  }

  try {
    const bundle = await buildLgpdExport(operatorId)
    const json = JSON.stringify(bundle, null, 2)
    const fileName = `export-${operatorId}-${Date.now()}.json`

    const supabase = await createSupabaseServer()
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(fileName, json, { contentType: 'application/json', upsert: false })

    if (uploadError) throw uploadError

    const { data: signedData, error: signError } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(fileName, TTL_SECONDS)

    if (signError || !signedData?.signedUrl) throw signError ?? new Error('signed URL vazia')

    const expiresAt = new Date(Date.now() + TTL_SECONDS * 1000)

    await prisma.dataExportRequest.update({
      where: { id: requestId },
      data: {
        status: 'ready',
        fileUrl: signedData.signedUrl,
        expiresAt,
        completedAt: new Date(),
      },
    })

    // TODO(TASK-2 ST005): enviar email "Seus dados estão prontos" nas 4 línguas
    // via src/lib/notifications/ quando template for criado (cross-ref TASK-9)
    console.info(`[lgpd-export.worker] export pronto | requestId=${requestId}`)
  } catch (err) {
    console.error('[lgpd-export.worker] erro:', err)
    await prisma.dataExportRequest.update({
      where: { id: requestId },
      data: { status: 'failed' },
    }).catch(() => null)
  }
}
