/**
 * Seed de Assets e ImageJobs — Inbound Forge (Dev)
 * Cobre: VisualAsset, ImageJob (todos os status), ImageTemplate (tipos extras),
 *        AlertLog, ApiUsageLog
 * Idempotente via upsert por id.
 */
import type { PrismaClient } from '@prisma/client'

export async function seedAssets(prisma: PrismaClient): Promise<void> {
  // ── VisualAssets (biblioteca de assets reutilizáveis) ───────────────────
  const assetsData = [
    {
      id: 'dev-asset-001',
      fileName: 'hero-inbound-blog-2026.jpg',
      originalName: 'hero-inbound-blog-2026.jpg',
      fileType: 'image/jpeg',
      fileSizeBytes: 284672,
      widthPx: 1200,
      heightPx: 630,
      storageUrl: 'https://picsum.photos/seed/inbound-hero/1200/630',
      thumbnailUrl: 'https://picsum.photos/seed/inbound-hero/400/210',
      altText: 'Diagrama de funil de inbound marketing com etapas de atração, conversão e fechamento',
      tags: ['blog', 'hero', 'inbound', 'funil'],
      usedInJobs: [],
      isActive: true,
    },
    {
      id: 'dev-asset-002',
      fileName: 'carousel-linkedin-autoridade.png',
      originalName: 'carousel-linkedin-autoridade.png',
      fileType: 'image/png',
      fileSizeBytes: 512000,
      widthPx: 1080,
      heightPx: 1080,
      storageUrl: 'https://picsum.photos/seed/linkedin-auth/1080/1080',
      thumbnailUrl: 'https://picsum.photos/seed/linkedin-auth/300/300',
      altText: 'Slide de carrossel: Como construir autoridade no LinkedIn em 90 dias',
      tags: ['linkedin', 'carrossel', 'autoridade'],
      usedInJobs: ['dev-job-003'],
      isActive: true,
    },
    {
      id: 'dev-asset-003',
      fileName: 'instagram-post-cac-reduction.jpg',
      originalName: 'instagram-post-cac-reduction.jpg',
      fileType: 'image/jpeg',
      fileSizeBytes: 196608,
      widthPx: 1080,
      heightPx: 1080,
      storageUrl: 'https://picsum.photos/seed/instagram-cac/1080/1080',
      thumbnailUrl: 'https://picsum.photos/seed/instagram-cac/300/300',
      altText: 'Infográfico mostrando redução de 40% no CAC com inbound marketing',
      tags: ['instagram', 'infográfico', 'CAC'],
      usedInJobs: [],
      isActive: true,
    },
    {
      id: 'dev-asset-004',
      fileName: 'background-dark-gradient.png',
      originalName: 'background-dark-gradient.png',
      fileType: 'image/png',
      fileSizeBytes: 98304,
      widthPx: 1080,
      heightPx: 1080,
      storageUrl: 'https://picsum.photos/seed/dark-gradient/1080/1080',
      thumbnailUrl: 'https://picsum.photos/seed/dark-gradient/300/300',
      altText: null,
      tags: ['background', 'template', 'dark'],
      usedInJobs: [],
      isActive: false, // inativo — substituído por versão atualizada
    },
  ]

  for (const asset of assetsData) {
    await prisma.visualAsset.upsert({
      where: { id: asset.id },
      update: {},
      create: asset,
    })
  }
  console.log(`  ✓ VisualAssets: ${assetsData.length} (3 ativos, 1 inativo)`)

  // Busca ContentPieces para associar ImageJobs
  const pieces = await prisma.contentPiece.findMany({ take: 4, orderBy: { createdAt: 'asc' } })
  const template = await prisma.imageTemplate.findFirst({ where: { isActive: true } })

  // ── ImageJobs (todos os status como string) ──────────────────────────────
  const jobsData = [
    // PENDING — job na fila, ainda não processado
    {
      id: 'dev-job-001',
      contentPieceId: pieces[0]?.id ?? null,
      templateType: 'CAROUSEL' as const,
      templateId: template?.id ?? null,
      provider: 'ideogram',
      status: 'PENDING',
      prompt: 'Carrossel LinkedIn sobre sistema de inbound marketing para PMEs brasileiras. Estilo corporativo clean, paleta azul e branco. Texto: "Como criar seu sistema de inbound do zero".',
      retryCount: 0,
    },
    // PROCESSING — job em execução
    {
      id: 'dev-job-002',
      contentPieceId: pieces[1]?.id ?? null,
      templateType: 'STATIC' as const,
      templateId: template?.id ?? null,
      provider: 'ideogram',
      status: 'PROCESSING',
      prompt: 'Post Instagram sobre redução de CAC. Infográfico minimalista com gráfico de barras mostrando -40%.',
      retryCount: 0,
      metadata: { startedAt: new Date(Date.now() - 15000).toISOString() },
    },
    // DONE — job concluído com sucesso
    {
      id: 'dev-job-003',
      contentPieceId: pieces[2]?.id ?? null,
      templateType: 'CAROUSEL' as const,
      templateId: template?.id ?? null,
      provider: 'ideogram',
      status: 'DONE',
      prompt: 'Carrossel LinkedIn sobre autoridade digital para consultores. 90 dias. Azul corporativo.',
      imageUrl: 'https://picsum.photos/seed/carousel-autoridade/1080/1080',
      backgroundUrl: 'https://picsum.photos/seed/bg-autoridade/1080/1080',
      outputUrl: 'https://storage.supabase.co/inboundforge/images/dev-job-003.png',
      processingMs: 8420,
      retryCount: 0,
      completedAt: new Date(Date.now() - 3600000),
    },
    // FAILED — job falhou após retries
    {
      id: 'dev-job-004',
      contentPieceId: pieces[3]?.id ?? null,
      templateType: 'STATIC' as const,
      templateId: null,
      provider: 'flux',
      status: 'FAILED',
      prompt: 'Post sobre conteúdo que não converte. Estilo before/after.',
      retryCount: 3,
      errorMessage: 'Provider timeout: Flux API não respondeu em 30s após 3 tentativas. Considere trocar para Ideogram.',
      metadata: { lastAttempt: new Date(Date.now() - 7200000).toISOString(), provider: 'flux', timeout: 30000 },
    },
  ]

  for (const job of jobsData) {
    await prisma.imageJob.upsert({
      where: { id: job.id },
      update: {},
      create: job,
    })
  }
  console.log(`  ✓ ImageJobs: ${jobsData.length} (PENDING, PROCESSING, DONE, FAILED)`)

  // ── AlertLogs (alertas do sistema) ──────────────────────────────────────
  const alertsData = [
    // Alerta ativo — worker sem heartbeat
    {
      id: 'dev-alert-001',
      type: 'worker_missing_heartbeat',
      severity: 'warning',
      message: 'Worker PUBLISHING não enviou heartbeat há mais de 10 minutos. Verificar Railway.',
      resolved: false,
    },
    // Alerta resolvido — cota de API
    {
      id: 'dev-alert-002',
      type: 'api_quota_warning',
      severity: 'warning',
      message: 'Uso da API Anthropic atingiu 80% da cota mensal. Monitorar consumo.',
      resolved: true,
      resolvedAt: new Date(Date.now() - 86400000),
    },
    // Alerta crítico resolvido — job com falha
    {
      id: 'dev-alert-003',
      type: 'image_job_permanent_failure',
      severity: 'error',
      message: 'ImageJob dev-job-004 falhou permanentemente após 3 tentativas com provider Flux.',
      resolved: false,
    },
  ]

  for (const alert of alertsData) {
    await prisma.alertLog.upsert({
      where: { id: alert.id },
      update: {},
      create: alert,
    })
  }
  console.log(`  ✓ AlertLogs: ${alertsData.length} (warning x2, error x1)`)

  // ── ApiUsageLogs (consumo de APIs externas) ──────────────────────────────
  const usageData = [
    { id: 'dev-api-001', service: 'anthropic', metric: 'tokens_input', value: 45230, cost: 0.0136, recordedAt: new Date(Date.now() - 86400000) },
    { id: 'dev-api-002', service: 'anthropic', metric: 'tokens_output', value: 12480, cost: 0.1872, recordedAt: new Date(Date.now() - 86400000) },
    { id: 'dev-api-003', service: 'ideogram', metric: 'images_generated', value: 8, cost: 0.96, recordedAt: new Date(Date.now() - 86400000) },
    { id: 'dev-api-004', service: 'flux', metric: 'images_failed', value: 3, cost: 0.0, recordedAt: new Date(Date.now() - 86400000) },
    { id: 'dev-api-005', service: 'anthropic', metric: 'tokens_input', value: 38750, cost: 0.0116, recordedAt: new Date(Date.now() - 172800000) },
    { id: 'dev-api-006', service: 'anthropic', metric: 'tokens_output', value: 9820, cost: 0.1473, recordedAt: new Date(Date.now() - 172800000) },
  ]

  for (const usage of usageData) {
    await prisma.apiUsageLog.upsert({
      where: { id: usage.id },
      update: {},
      create: usage,
    })
  }
  console.log(`  ✓ ApiUsageLogs: ${usageData.length} (anthropic + ideogram + flux)`)
}
