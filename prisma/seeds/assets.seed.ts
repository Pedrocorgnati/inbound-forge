/**
 * Seed de Assets e ImageJobs — Inbound Forge (Dev)
 * Atualizado: 2026-04-07 — Assets visuais para conteúdo SystemForge
 *
 * Cobre: VisualAsset, ImageJob (todos os status), AlertLog, ApiUsageLog, CostLog
 * Idempotente via upsert por id.
 */
import type { PrismaClient } from '@prisma/client'

export async function seedAssets(prisma: PrismaClient): Promise<void> {
  // ── VisualAssets — biblioteca de assets reutilizáveis ───────────────────
  const assetsData = [
    {
      id: 'dev-asset-001',
      fileName: 'hero-build-vs-buy-2026.jpg',
      originalName: 'hero-build-vs-buy-2026.jpg',
      fileType: 'image/jpeg',
      fileSizeBytes: 284672,
      widthPx: 1200,
      heightPx: 630,
      storageUrl: 'https://picsum.photos/seed/build-vs-buy/1200/630',
      thumbnailUrl: 'https://picsum.photos/seed/build-vs-buy/400/210',
      altText: 'Comparativo visual: lado esquerdo com planilhas caóticas, lado direito com dashboard organizado',
      tags: ['blog', 'hero', 'build-vs-buy', 'before-after'],
      usedInJobs: [],
      isActive: true,
    },
    {
      id: 'dev-asset-002',
      fileName: 'carousel-case-clinica.png',
      originalName: 'carousel-case-clinica-fisioterapia.png',
      fileType: 'image/png',
      fileSizeBytes: 512000,
      widthPx: 1080,
      heightPx: 1080,
      storageUrl: 'https://picsum.photos/seed/case-clinica/1080/1080',
      thumbnailUrl: 'https://picsum.photos/seed/case-clinica/300/300',
      altText: 'Slide de carrossel: Case clínica de fisioterapia — no-show reduziu 40% com sistema de agendamento',
      tags: ['linkedin', 'carrossel', 'case', 'saúde', 'agendamento'],
      usedInJobs: ['dev-job-003'],
      isActive: true,
    },
    {
      id: 'dev-asset-003',
      fileName: 'instagram-5-sinais-sistema.jpg',
      originalName: 'instagram-5-sinais-sistema-proprio.jpg',
      fileType: 'image/jpeg',
      fileSizeBytes: 196608,
      widthPx: 1080,
      heightPx: 1350,
      storageUrl: 'https://picsum.photos/seed/5-sinais/1080/1350',
      thumbnailUrl: 'https://picsum.photos/seed/5-sinais/300/375',
      altText: 'Carrossel Instagram: 5 sinais de que sua empresa precisa de sistema próprio',
      tags: ['instagram', 'carrossel', 'diagnóstico', '4:5'],
      usedInJobs: [],
      isActive: true,
    },
    {
      id: 'dev-asset-004',
      fileName: 'screenshot-dashboard-distribuidora.png',
      originalName: 'screenshot-dashboard-distribuidora-pedidos.png',
      fileType: 'image/png',
      fileSizeBytes: 342016,
      widthPx: 1920,
      heightPx: 1080,
      storageUrl: 'https://picsum.photos/seed/dashboard-dist/1920/1080',
      thumbnailUrl: 'https://picsum.photos/seed/dashboard-dist/400/225',
      altText: 'Screenshot real do dashboard de gestão de pedidos desenvolvido para distribuidora de alimentos',
      tags: ['screenshot', 'portfolio', 'dashboard', 'distribuidora'],
      usedInJobs: [],
      isActive: true,
    },
    {
      id: 'dev-asset-005',
      fileName: 'background-dark-gradient-v2.png',
      originalName: 'background-dark-gradient-v2.png',
      fileType: 'image/png',
      fileSizeBytes: 98304,
      widthPx: 1080,
      heightPx: 1080,
      storageUrl: 'https://picsum.photos/seed/dark-gradient-v2/1080/1080',
      thumbnailUrl: 'https://picsum.photos/seed/dark-gradient-v2/300/300',
      altText: null,
      tags: ['background', 'template', 'dark', 'gradiente'],
      usedInJobs: [],
      isActive: false, // inativo — substituído por versão com identidade SystemForge
    },
  ]

  for (const asset of assetsData) {
    await prisma.visualAsset.upsert({
      where: { id: asset.id },
      update: {},
      create: asset,
    })
  }
  console.log(`  ✓ VisualAssets: ${assetsData.length} (4 ativos, 1 inativo)`)

  // ── ImageJobs ────────────────────────────────────────────────────────────
  const pieces = await prisma.contentPiece.findMany({ take: 4, orderBy: { createdAt: 'asc' } })
  const template = await prisma.imageTemplate.findFirst({ where: { isActive: true } })

  const jobsData = [
    // PENDING
    {
      id: 'dev-job-001',
      contentPieceId: pieces[0]?.id ?? null,
      templateType: 'CAROUSEL' as const,
      templateId: template?.id ?? null,
      provider: 'ideogram',
      status: 'PENDING',
      prompt: 'Carrossel LinkedIn sobre eliminação de retrabalho operacional com software sob medida. Estilo corporativo, fundo escuro (#1a1a2e), destaque azul. Texto: "20h/semana de retrabalho eliminadas".',
      retryCount: 0,
    },
    // PROCESSING
    {
      id: 'dev-job-002',
      contentPieceId: pieces[1]?.id ?? null,
      templateType: 'STATIC' as const,
      templateId: template?.id ?? null,
      provider: 'ideogram',
      status: 'PROCESSING',
      prompt: 'Post Instagram sobre planilhas vs sistema. Antes/depois minimalista: lado esquerdo planilha caótica, lado direito dashboard limpo.',
      retryCount: 0,
      metadata: { startedAt: new Date(Date.now() - 15000).toISOString() },
    },
    // DONE
    {
      id: 'dev-job-003',
      contentPieceId: pieces[2]?.id ?? null,
      templateType: 'CAROUSEL' as const,
      templateId: template?.id ?? null,
      provider: 'ideogram',
      status: 'DONE',
      prompt: 'Carrossel LinkedIn case clínica de fisioterapia. Métricas em destaque: -40% no-show, +3h/dia recuperadas. Fundo escuro, números em verde.',
      imageUrl: 'https://picsum.photos/seed/case-clinica-job/1080/1080',
      backgroundUrl: 'https://picsum.photos/seed/bg-clinica/1080/1080',
      outputUrl: 'https://storage.supabase.co/inboundforge/images/dev-job-003.png',
      processingMs: 7850,
      retryCount: 0,
      completedAt: new Date(Date.now() - 3600000),
    },
    // FAILED
    {
      id: 'dev-job-004',
      contentPieceId: pieces[3]?.id ?? null,
      templateType: 'STATIC' as const,
      templateId: null,
      provider: 'flux',
      status: 'FAILED',
      prompt: 'Post sobre custo de software personalizado. Infográfico com faixas de preço.',
      retryCount: 3,
      errorMessage: 'Provider timeout: Flux API não respondeu em 30s após 3 tentativas. Considere trocar para Ideogram ($0.04/img vs $0.015/img Flux).',
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

  // ── VideoJobs — Short Video Maker MCP ─────────────────────────────────────
  const videoJobsData = [
    // PENDING — aguardando processamento
    {
      id: 'dev-video-001',
      orientation: 'PORTRAIT' as const,
      provider: 'short-video-maker',
      status: 'PENDING',
      scenes: [
        { text: 'Your business loses 20 hours per week to manual work. Copy-pasting between spreadsheets. Checking data by hand.', searchTerms: ['office work', 'spreadsheet', 'frustrated business'] },
        { text: 'Every new employee multiplies the problem. Your operational cost grows linearly with revenue.', searchTerms: ['growing team', 'business scaling', 'office workers'] },
        { text: 'Custom software eliminates the bottleneck. Automate what hurts most. See ROI in 90 days.', searchTerms: ['software dashboard', 'automation', 'business success'] },
      ],
      config: { paddingBack: 1500, music: true, captionPosition: 'bottom', voice: 'af_heart', orientation: 'portrait', musicVolume: 0.15 },
      prompt: 'Vídeo Reels sobre retrabalho operacional em PMEs — legendas PT-BR, narração EN',
      retryCount: 0,
    },
    // PROCESSING — em andamento
    {
      id: 'dev-video-002',
      orientation: 'PORTRAIT' as const,
      provider: 'short-video-maker',
      status: 'PROCESSING',
      externalVideoId: 'svm-abc123-processing',
      scenes: [
        { text: 'Five signs your business needs custom software. Number one: more than five people edit the same spreadsheet.', searchTerms: ['team meeting', 'spreadsheet chaos', 'business problem'] },
        { text: 'Number two: you type the same data into three different systems.', searchTerms: ['data entry', 'multiple screens', 'office frustration'] },
        { text: 'Number three: your monthly SaaS bill exceeds three thousand dollars and nothing integrates.', searchTerms: ['software subscriptions', 'expensive tools', 'disconnected apps'] },
        { text: 'If you checked three or more, book a free 30-minute diagnosis.', searchTerms: ['consultation', 'business meeting', 'handshake'] },
      ],
      config: { paddingBack: 1500, music: true, captionPosition: 'bottom', voice: 'am_adam', orientation: 'portrait', musicVolume: 0.12 },
      prompt: 'Vídeo Instagram Reels — checklist 5 sinais para sistema personalizado',
      retryCount: 0,
      metadata: { startedAt: new Date(Date.now() - 45000).toISOString() },
    },
    // DONE — vídeo pronto
    {
      id: 'dev-video-003',
      orientation: 'PORTRAIT' as const,
      provider: 'short-video-maker',
      status: 'DONE',
      externalVideoId: 'svm-xyz789-done',
      scenes: [
        { text: 'A distributor was managing orders via WhatsApp. One day, a twelve thousand dollar order got buried in chat.', searchTerms: ['whatsapp business', 'lost message', 'warehouse'] },
        { text: 'I built them a simple order system. All channels in one screen. Automatic pick lists. Real-time inventory.', searchTerms: ['dashboard software', 'order management', 'inventory system'] },
        { text: 'Result after six months: revenue up thirty-five percent. Zero lost orders.', searchTerms: ['business growth', 'success chart', 'celebration'] },
      ],
      config: { paddingBack: 2000, music: true, captionPosition: 'bottom', voice: 'af_heart', orientation: 'portrait', musicVolume: 0.15 },
      prompt: 'Vídeo case distribuidora — pedidos WhatsApp para sistema centralizado',
      outputUrl: 'https://storage.supabase.co/inboundforge/video-jobs/dev-video-003.mp4',
      thumbnailUrl: 'https://picsum.photos/seed/video-case-dist/1080/1920',
      durationMs: 42000,
      fileSizeBytes: 8_500_000,
      processingMs: 125000,
      retryCount: 0,
      completedAt: new Date(Date.now() - 7200000),
    },
    // FAILED — falha permanente
    {
      id: 'dev-video-004',
      orientation: 'LANDSCAPE' as const,
      provider: 'short-video-maker',
      status: 'FAILED',
      scenes: [
        { text: 'How much does custom software cost in Brazil? The real answer depends on three factors.', searchTerms: ['money', 'calculator', 'business planning'] },
      ],
      config: { paddingBack: 1500, music: true, captionPosition: 'bottom', voice: 'af_bella', orientation: 'landscape', musicVolume: 0.15 },
      prompt: 'Vídeo LinkedIn sobre custo de software personalizado',
      retryCount: 3,
      errorMessage: 'Short Video Maker timeout: container não respondeu em 300s após 3 tentativas. Verificar RAM disponível (requer 3-5 GB).',
      metadata: { lastAttempt: new Date(Date.now() - 14400000).toISOString() },
    },
  ]

  for (const job of videoJobsData) {
    await prisma.videoJob.upsert({
      where: { id: job.id },
      update: {},
      create: job,
    })
  }
  console.log(`  ✓ VideoJobs: ${videoJobsData.length} (PENDING, PROCESSING, DONE, FAILED)`)

  // ── AlertLogs ────────────────────────────────────────────────────────────
  const alertsData = [
    {
      id: 'dev-alert-001',
      type: 'worker_missing_heartbeat',
      severity: 'warning',
      message: 'Worker PUBLISHING não enviou heartbeat há mais de 10 minutos. Verificar Railway.',
      resolved: false,
    },
    {
      id: 'dev-alert-002',
      type: 'api_quota_warning',
      severity: 'warning',
      message: 'Uso da API Anthropic atingiu 75% da cota mensal (R$ 22.50 de R$ 30.00). Monitorar consumo de geração de conteúdo.',
      resolved: true,
      resolvedAt: new Date(Date.now() - 86400000),
    },
    {
      id: 'dev-alert-003',
      type: 'image_job_permanent_failure',
      severity: 'error',
      message: 'ImageJob dev-job-004 falhou permanentemente após 3 tentativas com provider Flux. Migrar para Ideogram para próximas gerações.',
      resolved: false,
    },
    {
      id: 'dev-alert-004',
      type: 'video_job_permanent_failure',
      severity: 'error',
      message: 'VideoJob dev-video-004 falhou permanentemente após 3 tentativas. Short Video Maker container com RAM insuficiente. Recomendado 4 GB+.',
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
  console.log(`  ✓ AlertLogs: ${alertsData.length}`)

  // ── ApiUsageLogs ─────────────────────────────────────────────────────────
  const usageData = [
    { id: 'dev-api-001', service: 'anthropic', metric: 'tokens_input', value: 52300, cost: 0.0157, recordedAt: new Date(Date.now() - 86400000) },
    { id: 'dev-api-002', service: 'anthropic', metric: 'tokens_output', value: 15800, cost: 0.2370, recordedAt: new Date(Date.now() - 86400000) },
    { id: 'dev-api-003', service: 'ideogram', metric: 'images_generated', value: 12, cost: 0.48, recordedAt: new Date(Date.now() - 86400000) },
    { id: 'dev-api-004', service: 'flux', metric: 'images_failed', value: 3, cost: 0.0, recordedAt: new Date(Date.now() - 86400000) },
    { id: 'dev-api-005', service: 'anthropic', metric: 'tokens_input', value: 41200, cost: 0.0124, recordedAt: new Date(Date.now() - 172800000) },
    { id: 'dev-api-006', service: 'anthropic', metric: 'tokens_output', value: 11300, cost: 0.1695, recordedAt: new Date(Date.now() - 172800000) },
    { id: 'dev-api-007', service: 'ideogram', metric: 'images_generated', value: 8, cost: 0.32, recordedAt: new Date(Date.now() - 172800000) },
  ]

  for (const usage of usageData) {
    await prisma.apiUsageLog.upsert({
      where: { id: usage.id },
      update: {},
      create: usage,
    })
  }
  console.log(`  ✓ ApiUsageLogs: ${usageData.length}`)

  // ── CostLogs — rastreamento de custo mensal ──────────────────────────────
  const costData = [
    { id: 'dev-cost-001', provider: 'anthropic', amount: 0.2527, operation: 'content_generation_3_angles', metadata: JSON.stringify({ themeId: 'dev-theme-001', pieces: 1 }), recordedAt: new Date(Date.now() - 86400000) },
    { id: 'dev-cost-002', provider: 'ideogram', amount: 0.48, operation: 'image_generation_carousel', metadata: JSON.stringify({ jobIds: ['dev-job-001', 'dev-job-003'], count: 12 }), recordedAt: new Date(Date.now() - 86400000) },
    { id: 'dev-cost-003', provider: 'anthropic', amount: 0.1819, operation: 'scraping_classification', metadata: JSON.stringify({ textsClassified: 23 }), recordedAt: new Date(Date.now() - 172800000) },
    { id: 'dev-cost-004', provider: 'short-video-maker', amount: 0.00, operation: 'video_generation', metadata: JSON.stringify({ jobId: 'dev-video-003', sizeBytes: 8500000, processingMs: 125000 }), recordedAt: new Date(Date.now() - 86400000) },
  ]

  for (const cost of costData) {
    await prisma.costLog.upsert({
      where: { id: cost.id },
      update: {},
      create: cost,
    })
  }
  console.log(`  ✓ CostLogs: ${costData.length}`)
}
