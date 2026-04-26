/**
 * Seed de Posts e Fila de Publicação — Inbound Forge (Dev)
 * Atualizado: 2026-04-07 — Posts focados em software sob medida / SystemForge
 *
 * Cobre: Post (todos os ContentStatus), PublishingQueue (todos os QueueStatus),
 *        PublishAuditLog, UTMLink
 * Idempotente via upsert por id.
 */
import type { PrismaClient } from '@prisma/client'

export async function seedPosts(prisma: PrismaClient): Promise<void> {
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

  // ── Posts — conteúdo SystemForge para atrair leads de software sob medida ──
  const postsData = [
    // DRAFT — LinkedIn, sobre retrabalho
    {
      id: 'dev-post-001',
      contentPieceId: pieces[0]?.id ?? null,
      channel: 'LINKEDIN' as const,
      caption: `Sua equipe perde 20 horas por semana com retrabalho.\n\nNão porque é incompetente. Porque os processos foram construídos em cima de planilhas, WhatsApp e "sempre fizemos assim".\n\nUm sistema sob medida não é luxo. É a diferença entre crescer com a mesma equipe ou contratar mais gente para fazer a mesma coisa.\n\nNos últimos 12 meses, vi construtoras, distribuidoras e clínicas eliminarem retrabalho com software que custa menos que um salário.\n\nSe seu processo depende de copiar dados entre 3 planilhas, já passou da hora.`,
      hashtags: ['#automação', '#PME', '#softwaresobmedida', '#produtividade', '#transformaçãodigital'],
      cta: 'Salve para ler depois',
      ctaText: 'Quer um diagnóstico gratuito do seu processo?',
      ctaUrl: 'https://wa.me/5547999999999?text=Oi%20Pedro%2C%20vi%20seu%20post%20sobre%20retrabalho%20e%20quero%20entender%20como%20funciona',
      status: 'DRAFT' as const,
    },
    // REVIEW — Instagram, sobre planilhas
    {
      id: 'dev-post-002',
      contentPieceId: pieces[1]?.id ?? null,
      channel: 'INSTAGRAM' as const,
      caption: `📊 Sua planilha de vendas está te custando clientes.\n\nSinais de que chegou a hora de trocar:\n\n❌ Mais de 5 pessoas editam a mesma planilha\n❌ Você já perdeu dados por "alguém apagou sem querer"\n❌ Relatórios levam dias para ficarem prontos\n❌ Não sabe o faturamento real até o fechamento\n❌ Cada vendedor tem sua própria versão\n\nSe marcou 3+, você precisa de um sistema — não de outra planilha.\n\n💬 Manda "DIAGNÓSTICO" no DM que eu te ajudo a mapear.`,
      hashtags: ['#gestão', '#PME', '#planilha', '#sistema', '#tecnologia', '#empreendedorismo'],
      cta: 'Manda DIAGNÓSTICO no DM',
      status: 'REVIEW' as const,
    },
    // APPROVED — LinkedIn, case distribuidora
    {
      id: 'dev-post-003',
      contentPieceId: pieces[2]?.id ?? null,
      channel: 'LINKEDIN' as const,
      scheduledAt: future(3),
      approvedAt: past(1),
      caption: `Quanto custa um software personalizado em 2026?\n\nA resposta honesta que ninguém dá:\n\n→ MVP simples (10-15 telas): R$ 20-50 mil\n→ Sistema médio (25-40 telas): R$ 80-200 mil\n→ Plataforma complexa (40+ telas): R$ 200 mil+\n\nMas a pergunta certa não é "quanto custa".\nÉ "quanto está custando NÃO ter".\n\nUma distribuidora perdia R$ 30 mil/mês em pedidos perdidos por usar WhatsApp. O sistema custou R$ 45 mil e se pagou em 45 dias.\n\nA maioria das PMEs não precisa de plataforma complexa. Precisa de automação cirúrgica no ponto que mais dói.\n\n📊 Leia o guia completo com valores reais no blog.`,
      hashtags: ['#software', '#custos', '#PME', '#desenvolvimento', '#ROI', '#investimento'],
      cta: 'Leia o guia completo no blog',
      ctaText: 'Ver guia de custos',
      ctaUrl: 'https://corgnati.com/blog/quanto-custa-software-personalizado-2026',
      trackingUrl: 'https://corgnati.com/blog/quanto-custa-software-personalizado-2026?utm_source=linkedin&utm_medium=organic&utm_campaign=custos-software-q2-2026',
      status: 'APPROVED' as const,
    },
    // SCHEDULED — LinkedIn, case clínica
    {
      id: 'dev-post-004',
      contentPieceId: pieces[3]?.id ?? null,
      channel: 'LINKEDIN' as const,
      scheduledAt: future(1),
      approvedAt: past(2),
      caption: `Uma clínica de fisioterapia me procurou com um problema:\n\n"Pedro, 35% dos pacientes faltam sem avisar. A recepcionista liga um por um no dia anterior. Gastamos 3 horas por dia nisso."\n\nO que construímos:\n✅ Agendamento online integrado ao WhatsApp\n✅ Lembrete automático 24h e 2h antes\n✅ Confirmação com 1 clique\n✅ Lista de espera automática para cancelamentos\n\nResultados em 90 dias:\n📉 No-show caiu de 35% para 21% (-40%)\n⏱️ Recepcionista recuperou 3h/dia\n💰 ROI positivo em 4 meses\n\nO sistema não era complexo. Era cirúrgico no ponto certo.\n\nSe você tem uma clínica ou consultório com problema de no-show, me manda mensagem. O diagnóstico é gratuito.`,
      hashtags: ['#saúde', '#clínica', '#agendamento', '#automação', '#case', '#resultados'],
      cta: 'Diagnóstico gratuito para clínicas',
      status: 'SCHEDULED' as const,
      platform: 'linkedin_assisted',
    },
    // PUBLISHED — LinkedIn, sobre WhatsApp comercial
    {
      id: 'dev-post-005',
      contentPieceId: pieces[4]?.id ?? null,
      channel: 'LINKEDIN' as const,
      scheduledAt: past(1),
      publishedAt: past(1),
      approvedAt: past(3),
      caption: `O erro mais caro de uma PME: depender do WhatsApp para gestão comercial.\n\nNão estou dizendo para parar de usar WhatsApp com clientes.\nEstou dizendo que WhatsApp como CRM é um desastre.\n\nO que acontece quando o vendedor sai?\n→ Todas as conversas, propostas e follow-ups vão embora com ele.\n\nO que acontece quando 3 vendedores mandam proposta para o mesmo cliente?\n→ Sua empresa parece desorganizada. O cliente percebe.\n\nO que acontece quando ninguém faz follow-up no timing certo?\n→ O concorrente que tem sistema fecha a venda.\n\nUma distribuidora que atendia pedidos por WhatsApp perdeu R$ 30 mil em um mês só com pedidos que "caíram" na conversa.\n\nSistema de gestão comercial não é custo. É proteção contra prejuízo invisível.\n\n🔗 Se isso descreve sua empresa, me chama no WhatsApp.`,
      hashtags: ['#vendas', '#CRM', '#WhatsApp', '#PME', '#gestãocomercial', '#B2B'],
      cta: 'Me chama no WhatsApp',
      status: 'PUBLISHED' as const,
      platform: 'linkedin_assisted',
      platformPostId: 'urn:li:ugcPost:7280000000000001',
    },
    // FAILED — Instagram, automação
    {
      id: 'dev-post-006',
      contentPieceId: pieces[5]?.id ?? null,
      channel: 'INSTAGRAM' as const,
      scheduledAt: past(2),
      approvedAt: past(4),
      caption: `Construir vs. Comprar?\n\nQuando SaaS genérico resolve:\n✅ Necessidade padrão (email, chat, docs)\n✅ Processo comum a qualquer empresa\n✅ Equipe pequena (<10 pessoas)\n\nQuando sistema próprio é melhor:\n✅ Processo único do seu negócio\n✅ 5+ ferramentas SaaS desconectadas\n✅ Custo de assinaturas > R$ 3 mil/mês\n✅ Dados em silos que não conversam\n✅ Crescimento travado por limitação de ferramenta`,
      hashtags: ['#software', '#SaaS', '#buildvsbuy', '#PME', '#tecnologia'],
      cta: 'Link na bio para o artigo completo',
      status: 'FAILED' as const,
      platform: 'instagram_graph_api',
      errorMessage: 'Erro 400: IMAGE_RATIO_INVALID — proporção da imagem não aceita pelo Instagram (esperado 4:5, recebido 16:9)',
    },
    // PENDING_ART — Blog, LGPD
    {
      id: 'dev-post-007',
      contentPieceId: pieces[6]?.id ?? null,
      channel: 'BLOG' as const,
      caption: 'LGPD para PMEs: o que você precisa fazer antes que a ANPD bata na porta. Guia prático para clínicas, escritórios e empresas de serviço.',
      hashtags: ['#LGPD', '#compliance', '#dados', '#PME', '#privacidade'],
      cta: 'Agende uma avaliação de compliance',
      status: 'PENDING_ART' as const,
    },
    // Post manual sem ContentPiece (bastidor do desenvolvedor)
    {
      id: 'dev-post-008',
      contentPieceId: null,
      channel: 'LINKEDIN' as const,
      scheduledAt: future(7),
      caption: `Bastidor: como entrego projetos de software sem atraso.\n\nNão é mágica. É método.\n\nAntes de escrever 1 linha de código, documento TUDO:\n\n1. PRD (Product Requirements) — o que o sistema faz\n2. User Stories BDD — como cada funcionalidade se comporta\n3. HLD/LLD — arquitetura e design técnico\n4. API Contract — endpoints definidos antes do backend\n\nSó depois de documentar, codifico.\n\nParece mais lento? Na verdade é mais rápido.\n\nPor quê? Porque 35% dos projetos de software fracassam por escopo mal definido (CHAOS Report 2024). Documentar primeiro elimina ambiguidade antes que ela vire retrabalho caro.\n\nÉ o que chamo de metodologia documentation-first. É o que diferencia entregar em 30 dias vs. 6 meses de vai-e-volta.`,
      hashtags: ['#desenvolvimento', '#metodologia', '#bastidor', '#software', '#documentação'],
      cta: 'Curta se você já sofreu com projeto sem documentação',
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

  // ── UTM Links ────────────────────────────────────────────────────────────
  const utmData = [
    {
      id: 'dev-utm-001',
      postId: 'dev-post-005', // PUBLISHED — WhatsApp comercial
      source: 'linkedin',
      medium: 'organic',
      campaign: 'whatsapp-comercial-q2-2026',
      content: 'post-texto-whatsapp',
      fullUrl: 'https://wa.me/5547999999999?text=Vi%20seu%20post%20sobre%20WhatsApp%20comercial&utm_source=linkedin&utm_medium=organic&utm_campaign=whatsapp-comercial-q2-2026',
      clicks: 47,
    },
    {
      id: 'dev-utm-002',
      postId: 'dev-post-003', // APPROVED — custos
      source: 'linkedin',
      medium: 'organic',
      campaign: 'custos-software-q2-2026',
      content: 'post-custos-guia',
      fullUrl: 'https://corgnati.com/blog/quanto-custa-software-personalizado-2026?utm_source=linkedin&utm_medium=organic&utm_campaign=custos-software-q2-2026',
      clicks: 0,
    },
    {
      id: 'dev-utm-003',
      postId: 'dev-post-004', // SCHEDULED — case clínica
      source: 'linkedin',
      medium: 'organic',
      campaign: 'case-clinica-q2-2026',
      content: 'carousel-case-clinica',
      fullUrl: 'https://wa.me/5547999999999?text=Vi%20o%20case%20da%20cl%C3%ADnica%20e%20quero%20saber%20mais&utm_source=linkedin&utm_medium=organic&utm_campaign=case-clinica-q2-2026',
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

  // ── PublishingQueue (todos os QueueStatus) ────────────────────────────────
  const queueData = [
    {
      id: 'dev-queue-001',
      postId: 'dev-post-004', // SCHEDULED
      channel: 'linkedin',
      scheduledAt: future(1),
      priority: 1,
      attempts: 0,
      status: 'PENDING' as const,
    },
    {
      id: 'dev-queue-002',
      postId: 'dev-post-003', // APPROVED
      channel: 'linkedin',
      scheduledAt: future(3),
      priority: 2,
      attempts: 1,
      lastAttemptAt: past(0),
      status: 'PROCESSING' as const,
    },
    {
      id: 'dev-queue-003',
      postId: 'dev-post-005', // PUBLISHED
      channel: 'linkedin',
      scheduledAt: past(1),
      priority: 0,
      attempts: 1,
      lastAttemptAt: past(1),
      status: 'DONE' as const,
    },
    {
      id: 'dev-queue-004',
      postId: 'dev-post-006', // FAILED
      channel: 'instagram',
      scheduledAt: past(2),
      priority: 0,
      attempts: 3,
      maxAttempts: 3,
      lastAttemptAt: past(2),
      lastError: 'Erro 400: IMAGE_RATIO_INVALID — proporção 16:9 não aceita pelo Instagram (esperado 4:5)',
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

  // ── PublishAuditLog ──────────────────────────────────────────────────────
  const auditLogsData = [
    {
      id: 'dev-audit-001',
      postId: 'dev-post-005',
      action: 'publish_attempt',
      result: 'success',
      platformPostId: 'urn:li:ugcPost:7280000000000001',
      attempts: 1,
      timestamp: past(1),
    },
    {
      id: 'dev-audit-002',
      postId: 'dev-post-005',
      action: 'publish_success',
      result: 'success',
      platformPostId: 'urn:li:ugcPost:7280000000000001',
      attempts: 1,
      timestamp: past(1),
    },
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
