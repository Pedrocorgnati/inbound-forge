/**
 * Seed de Posts e Fila de Publicação — Inbound Forge (Dev)
 * Cobre: Post (todos os ContentStatus), PublishingQueue (todos os QueueStatus),
 *        PublishAuditLog, UTMLink
 * Idempotente via upsert por id.
 */
import type { PrismaClient } from '@prisma/client'

export async function seedPosts(prisma: PrismaClient): Promise<void> {
  // Busca ContentPieces existentes para associar posts
  const pieces = await prisma.contentPiece.findMany({
    where: { status: { in: ['APPROVED', 'PUBLISHED', 'SCHEDULED', 'DRAFT', 'REVIEW'] } },
    take: 8,
    orderBy: { createdAt: 'asc' },
  })

  if (pieces.length === 0) {
    console.log('[seed:posts] Nenhum ContentPiece encontrado — pulando posts')
    return
  }

  const now = new Date()
  const past = (days: number) => new Date(now.getTime() - days * 86400000)
  const future = (days: number) => new Date(now.getTime() + days * 86400000)

  // ── Posts com todos os ContentStatus ────────────────────────────────────────
  const postsData = [
    // DRAFT — LinkedIn, sem data de publicação
    {
      id: 'dev-post-001',
      contentPieceId: pieces[0]?.id ?? null,
      channel: 'LINKEDIN' as const,
      caption: 'Como criar um sistema de inbound marketing do zero para PMEs — guia prático em 5 passos.',
      hashtags: ['#inbound', '#B2B', '#marketing', '#PME'],
      cta: 'Salve para ler depois',
      ctaText: 'Baixe o checklist gratuito',
      ctaUrl: 'https://inboundforge.dev/checklist-inbound',
      status: 'DRAFT' as const,
    },
    // REVIEW — Instagram
    {
      id: 'dev-post-002',
      contentPieceId: pieces[1]?.id ?? null,
      channel: 'INSTAGRAM' as const,
      caption: '5 erros que fazem seu conteúdo não converter em leads. O erro #3 é o mais comum nas PMEs.',
      hashtags: ['#marketing', '#conteudo', '#inbound', '#leads'],
      cta: 'Link na bio',
      status: 'REVIEW' as const,
    },
    // APPROVED — LinkedIn, com data futura agendada
    {
      id: 'dev-post-003',
      contentPieceId: pieces[2]?.id ?? null,
      channel: 'LINKEDIN' as const,
      scheduledAt: future(3),
      approvedAt: past(1),
      caption: 'Como reduzir seu CAC em 40% usando conteúdo orgânico. Case real de consultora B2B.',
      hashtags: ['#CAC', '#inbound', '#marketing', '#B2B', '#conteudo'],
      cta: 'Leia o artigo completo',
      ctaText: 'Ver no blog',
      ctaUrl: 'https://inboundforge.dev/blog/reduzir-cac',
      trackingUrl: 'https://inboundforge.dev/blog/reduzir-cac?utm_source=linkedin',
      status: 'APPROVED' as const,
    },
    // SCHEDULED — LinkedIn, agendado para amanhã
    {
      id: 'dev-post-004',
      contentPieceId: pieces[3]?.id ?? null,
      channel: 'LINKEDIN' as const,
      scheduledAt: future(1),
      approvedAt: past(2),
      caption: 'LinkedIn para consultores: do zero à autoridade em 90 dias. Passo a passo testado.',
      hashtags: ['#LinkedIn', '#autoridade', '#consultores', '#B2B'],
      cta: 'Salve e compartilhe',
      status: 'SCHEDULED' as const,
      platform: 'linkedin_assisted',
    },
    // PUBLISHED — LinkedIn, publicado ontem
    {
      id: 'dev-post-005',
      contentPieceId: pieces[4]?.id ?? null,
      channel: 'LINKEDIN' as const,
      scheduledAt: past(1),
      publishedAt: past(1),
      approvedAt: past(3),
      caption: 'Por que seu conteúdo não converte? Diagnóstico dos 5 erros mais comuns em PMEs B2B.',
      hashtags: ['#conteudo', '#conversao', '#B2B', '#marketing'],
      cta: 'Comente sua maior dificuldade',
      status: 'PUBLISHED' as const,
      platform: 'linkedin_assisted',
      platformPostId: 'urn:li:ugcPost:7180000000000001',
    },
    // FAILED — Instagram, falhou no publish
    {
      id: 'dev-post-006',
      contentPieceId: pieces[5]?.id ?? null,
      channel: 'INSTAGRAM' as const,
      scheduledAt: past(2),
      approvedAt: past(4),
      caption: 'Automação de conteúdo: guia prático para equipes de 1-3 pessoas.',
      hashtags: ['#automacao', '#conteudo', '#PME', '#digital'],
      cta: 'Link na bio para o guia completo',
      status: 'FAILED' as const,
      platform: 'instagram_graph_api',
      errorMessage: 'Erro 400: IMAGE_RATIO_INVALID — proporção da imagem não aceita pelo Instagram',
    },
    // PENDING_ART — Blog, aguardando geração de imagem
    {
      id: 'dev-post-007',
      contentPieceId: pieces[6]?.id ?? null,
      channel: 'BLOG' as const,
      caption: 'Checklist: seu conteúdo está pronto para converter? 12 pontos de verificação essenciais.',
      hashtags: ['#blog', '#checklist', '#marketing', '#conteudo'],
      cta: 'Compartilhe com sua equipe',
      status: 'PENDING_ART' as const,
    },
    // Post manual sem ContentPiece (caso edge: post criado diretamente pelo operador)
    {
      id: 'dev-post-008',
      contentPieceId: null,
      channel: 'LINKEDIN' as const,
      scheduledAt: future(7),
      caption: 'Post manual de teste — criado diretamente pelo operador sem ContentPiece associado.',
      hashtags: ['#manual', '#teste'],
      cta: 'Teste de publicação manual',
      status: 'DRAFT' as const,
    },
  ]

  for (const postData of postsData) {
    await prisma.post.upsert({
      where: { id: postData.id },
      update: {},
      create: postData,
    })
  }
  console.log(`  ✓ Posts: ${postsData.length} (DRAFT, REVIEW, APPROVED, SCHEDULED, PUBLISHED, FAILED, PENDING_ART + manual)`)

  // ── UTM Links (para posts publicados/agendados) ───────────────────────────
  const utmData = [
    {
      id: 'dev-utm-001',
      postId: 'dev-post-005', // PUBLISHED
      source: 'linkedin',
      medium: 'organic',
      campaign: 'inbound-awareness-q1-2026',
      content: 'carousel-diagnostico',
      fullUrl: 'https://inboundforge.dev/blog/conteudo-que-converte?utm_source=linkedin&utm_medium=organic&utm_campaign=inbound-awareness-q1-2026',
      clicks: 127,
    },
    {
      id: 'dev-utm-002',
      postId: 'dev-post-003', // APPROVED (futuro)
      source: 'linkedin',
      medium: 'organic',
      campaign: 'reducao-cac-q2-2026',
      content: 'artigo-cac',
      fullUrl: 'https://inboundforge.dev/blog/reduzir-cac?utm_source=linkedin&utm_medium=organic&utm_campaign=reducao-cac-q2-2026',
      clicks: 0,
    },
  ]

  for (const utm of utmData) {
    await prisma.uTMLink.upsert({
      where: { id: utm.id },
      update: {},
      create: utm,
    })
  }
  console.log(`  ✓ UTMLinks: ${utmData.length}`)

  // ── PublishingQueue (todos os QueueStatus) ───────────────────────────────
  const queueData = [
    {
      id: 'dev-queue-001',
      postId: 'dev-post-004', // SCHEDULED — fila pendente
      channel: 'linkedin',
      scheduledAt: future(1),
      priority: 1,
      attempts: 0,
      status: 'PENDING' as const,
    },
    {
      id: 'dev-queue-002',
      postId: 'dev-post-003', // APPROVED — sendo processada agora
      channel: 'linkedin',
      scheduledAt: future(3),
      priority: 2,
      attempts: 1,
      lastAttemptAt: past(0),
      status: 'PROCESSING' as const,
    },
    {
      id: 'dev-queue-003',
      postId: 'dev-post-005', // PUBLISHED — fila concluída
      channel: 'linkedin',
      scheduledAt: past(1),
      priority: 0,
      attempts: 1,
      lastAttemptAt: past(1),
      status: 'DONE' as const,
    },
    {
      id: 'dev-queue-004',
      postId: 'dev-post-006', // FAILED — esgotou tentativas
      channel: 'instagram',
      scheduledAt: past(2),
      priority: 0,
      attempts: 3,
      maxAttempts: 3,
      lastAttemptAt: past(2),
      lastError: 'Erro 400: IMAGE_RATIO_INVALID — proporção da imagem não aceita pelo Instagram',
      status: 'FAILED' as const,
    },
  ]

  for (const qItem of queueData) {
    await prisma.publishingQueue.upsert({
      where: { id: qItem.id },
      update: {},
      create: qItem,
    })
  }
  console.log(`  ✓ PublishingQueue: ${queueData.length} (PENDING, PROCESSING, DONE, FAILED)`)

  // ── PublishAuditLog (trilha de auditoria de publicações) ─────────────────
  const auditLogsData = [
    // Post publicado com sucesso (1 tentativa)
    {
      id: 'dev-audit-001',
      postId: 'dev-post-005',
      action: 'publish_attempt',
      result: 'success',
      platformPostId: 'urn:li:ugcPost:7180000000000001',
      attempts: 1,
      timestamp: past(1),
    },
    {
      id: 'dev-audit-002',
      postId: 'dev-post-005',
      action: 'publish_success',
      result: 'success',
      platformPostId: 'urn:li:ugcPost:7180000000000001',
      attempts: 1,
      timestamp: past(1),
    },
    // Post que falhou (3 tentativas + permanent_fail)
    {
      id: 'dev-audit-003',
      postId: 'dev-post-006',
      action: 'publish_attempt',
      result: 'failure',
      errorMessage: 'Erro 400: IMAGE_RATIO_INVALID',
      attempts: 1,
      timestamp: past(2),
    },
    {
      id: 'dev-audit-004',
      postId: 'dev-post-006',
      action: 'queue_retry',
      result: 'failure',
      errorMessage: 'Erro 400: IMAGE_RATIO_INVALID',
      attempts: 2,
      timestamp: past(2),
    },
    {
      id: 'dev-audit-005',
      postId: 'dev-post-006',
      action: 'permanent_fail',
      result: 'failure',
      errorMessage: 'Erro 400: IMAGE_RATIO_INVALID — max tentativas atingido',
      attempts: 3,
      timestamp: past(2),
    },
  ]

  for (const log of auditLogsData) {
    await prisma.publishAuditLog.upsert({
      where: { id: log.id },
      update: {},
      create: log,
    })
  }
  console.log(`  ✓ PublishAuditLogs: ${auditLogsData.length}`)
}
