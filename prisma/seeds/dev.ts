/**
 * Seed de Desenvolvimento — Inbound Forge
 * Criado por: auto-flow execute (module-1/TASK-2/ST002)
 * Atualizado: 2026-04-07 — Seed completo focado em SystemForge
 *
 * Contexto: SystemForge é um framework documentation-first de desenvolvimento
 * de software sob medida. Alta capacidade de lidar com projetos em paralelo,
 * poucos clientes pagantes. O Inbound Forge foi criado para resolver isso
 * gerando conteúdo estratégico que atrai leads qualificados.
 *
 * Volume realista para desenvolvimento local.
 * Idempotente via upsert.
 */
import type { PrismaClient } from '@prisma/client'
import { upsertOperator, checkSeedAlreadyRun, markSeedComplete } from './helpers'
import { seedScraping } from './scraping.seed'
import { seedPosts } from './posts.seed'
import { seedBlog } from './blog.seed'
import { seedLeads } from './leads.seed'
import { seedAssets } from './assets.seed'

export async function seedDev(prisma: PrismaClient) {
  console.log('🌱 [DEV] Iniciando seed de desenvolvimento — contexto SystemForge...')

  // Operator
  const operator = await upsertOperator(prisma, 'pedro@corgnati.com')
  console.log(`  ✓ Operator: ${operator.email}`)

  // WorkerHealth (4 workers — um por tipo)
  const workers = await Promise.all([
    prisma.workerHealth.upsert({
      where: { type: 'SCRAPING' },
      update: {},
      create: { type: 'SCRAPING', status: 'IDLE' },
    }),
    prisma.workerHealth.upsert({
      where: { type: 'IMAGE' },
      update: {},
      create: { type: 'IMAGE', status: 'IDLE' },
    }),
    prisma.workerHealth.upsert({
      where: { type: 'VIDEO' },
      update: {},
      create: { type: 'VIDEO', status: 'IDLE' },
    }),
    prisma.workerHealth.upsert({
      where: { type: 'PUBLISHING' },
      update: {},
      create: { type: 'PUBLISHING', status: 'IDLE' },
    }),
  ])
  console.log(`  ✓ WorkerHealth: ${workers.length} workers`)

  // ─── PainLibraryEntries (15) — Dores reais de PMEs que precisam de software sob medida ───
  const pains = await Promise.all([
    prisma.painLibraryEntry.upsert({
      where: { id: 'dev-pain-001' },
      update: {},
      create: {
        id: 'dev-pain-001',
        title: 'Processos operacionais manuais limitando crescimento',
        description: 'Empresa perde 20+ horas semanais com retrabalho manual: copiar dados entre sistemas, conferir planilhas, gerar relatórios na mão. Cada novo funcionário multiplica o problema em vez de resolvê-lo.',
        sectors: ['serviços B2B', 'consultoria', 'indústria'],
        relevanceScore: 95,
        status: 'VALIDATED',
      },
    }),
    prisma.painLibraryEntry.upsert({
      where: { id: 'dev-pain-002' },
      update: {},
      create: {
        id: 'dev-pain-002',
        title: 'Planilhas que não escalam além de 5 funcionários',
        description: 'Negócio começou controlando tudo no Excel. Com o crescimento, planilhas ficam lentas, dados se perdem, versões conflitam. Não há controle de acesso nem auditoria de quem alterou o quê.',
        sectors: ['varejo', 'distribuidoras', 'franquias'],
        relevanceScore: 92,
        status: 'VALIDATED',
      },
    }),
    prisma.painLibraryEntry.upsert({
      where: { id: 'dev-pain-003' },
      update: {},
      create: {
        id: 'dev-pain-003',
        title: 'Gestão comercial via WhatsApp sem rastreabilidade',
        description: 'Orçamentos enviados por WhatsApp sem registro centralizado. Impossível saber quantas propostas foram enviadas, qual a taxa de conversão, ou qual vendedor performa melhor. Follow-up depende da memória de cada pessoa.',
        sectors: ['serviços B2B', 'construtoras', 'profissionais liberais'],
        relevanceScore: 90,
        status: 'VALIDATED',
      },
    }),
    prisma.painLibraryEntry.upsert({
      where: { id: 'dev-pain-004' },
      update: {},
      create: {
        id: 'dev-pain-004',
        title: 'Falta de integração entre ERPs e ferramentas internas',
        description: 'Empresa usa ERP, CRM, planilha de RH e sistema financeiro separados. Dados precisam ser digitados 3x. Média de 897 apps por organização, mas apenas 29% integrados (MuleSoft 2024).',
        sectors: ['indústria', 'logística', 'atacado'],
        relevanceScore: 88,
        status: 'VALIDATED',
      },
    }),
    prisma.painLibraryEntry.upsert({
      where: { id: 'dev-pain-005' },
      update: {},
      create: {
        id: 'dev-pain-005',
        title: 'Ausência de dashboards para tomada de decisão',
        description: 'Gestor toma decisões baseado em intuição porque não tem dados consolidados. Relatórios gerenciais levam dias para serem montados manualmente. Quando ficam prontos, os dados já estão defasados.',
        sectors: ['todos os setores B2B', 'saúde', 'educação'],
        relevanceScore: 87,
        status: 'VALIDATED',
      },
    }),
    prisma.painLibraryEntry.upsert({
      where: { id: 'dev-pain-006' },
      update: {},
      create: {
        id: 'dev-pain-006',
        title: 'Atendimento ao cliente lento por falta de automação',
        description: 'Clientes esperam horas por respostas que poderiam ser automatizadas. Sem sistema de tickets, reclamações se perdem. NPS cai mês a mês enquanto a concorrência digitaliza.',
        sectors: ['clínicas', 'e-commerce', 'telecomunicações'],
        relevanceScore: 84,
        status: 'VALIDATED',
      },
    }),
    prisma.painLibraryEntry.upsert({
      where: { id: 'dev-pain-007' },
      update: {},
      create: {
        id: 'dev-pain-007',
        title: 'Dependência de pessoa-chave que concentra conhecimento',
        description: 'Um funcionário é o único que sabe como funciona o processo. Se ele sai, a operação para. Sem documentação de processos nem sistema que formalize o fluxo de trabalho.',
        sectors: ['PMEs', 'escritórios contábeis', 'engenharia'],
        relevanceScore: 86,
        status: 'VALIDATED',
      },
    }),
    prisma.painLibraryEntry.upsert({
      where: { id: 'dev-pain-008' },
      update: {},
      create: {
        id: 'dev-pain-008',
        title: 'Orçamentação manual com erros e retrabalho constante',
        description: 'Montar orçamento leva 2-3 horas por cliente. Erros de cálculo, esquecimento de itens, versões desatualizadas de tabela de preços. Cada proposta errada é uma venda perdida ou prejuízo absorvido.',
        sectors: ['construtoras', 'gráficas', 'metalúrgicas'],
        relevanceScore: 89,
        status: 'VALIDATED',
      },
    }),
    prisma.painLibraryEntry.upsert({
      where: { id: 'dev-pain-009' },
      update: {},
      create: {
        id: 'dev-pain-009',
        title: 'Escalabilidade travada por processos manuais',
        description: 'Empresa tem demanda para crescer 3x mas não consegue escalar operação. Cada novo cliente significa mais gente fazendo a mesma coisa manual. Custo operacional cresce linear com a receita.',
        sectors: ['startups', 'scale-ups', 'franquias'],
        relevanceScore: 93,
        status: 'VALIDATED',
      },
    }),
    prisma.painLibraryEntry.upsert({
      where: { id: 'dev-pain-010' },
      update: {},
      create: {
        id: 'dev-pain-010',
        title: 'Erros em dados por digitação manual repetitiva',
        description: 'Notas fiscais, pedidos de compra e controle de estoque digitados manualmente. Taxa de erro de 3-5% que gera retrabalho, devoluções e perda de credibilidade com clientes.',
        sectors: ['distribuidoras', 'atacado', 'indústria'],
        relevanceScore: 85,
        status: 'VALIDATED',
      },
    }),
    prisma.painLibraryEntry.upsert({
      where: { id: 'dev-pain-011' },
      update: {},
      create: {
        id: 'dev-pain-011',
        title: 'Falta de sistema próprio como diferencial competitivo',
        description: 'Concorrente tem plataforma digital e ganha clientes pela experiência superior. Empresa sem sistema perde negócios não por preço, mas por parecer "artesanal" demais para clientes maiores.',
        sectors: ['agências', 'consultorias', 'serviços profissionais'],
        relevanceScore: 82,
        status: 'VALIDATED',
      },
    }),
    prisma.painLibraryEntry.upsert({
      where: { id: 'dev-pain-012' },
      update: {},
      create: {
        id: 'dev-pain-012',
        title: 'Compliance LGPD/regulatório sem sistema adequado',
        description: 'Dados de clientes em planilhas compartilhadas, sem controle de acesso, sem log de quem acessou o quê. Multa LGPD pode chegar a 2% do faturamento. Clínicas, escritórios e fintechs são alvos prioritários da ANPD.',
        sectors: ['saúde', 'jurídico', 'fintech'],
        relevanceScore: 80,
        status: 'VALIDATED',
      },
    }),
    prisma.painLibraryEntry.upsert({
      where: { id: 'dev-pain-013' },
      update: {},
      create: {
        id: 'dev-pain-013',
        title: 'Gestão de estoque/logística por planilha',
        description: 'Estoque desatualizado gera vendas de produtos indisponíveis, compras em excesso e ruptura de itens críticos. Sem integração com vendas, o financeiro descobre furos só no fechamento.',
        sectors: ['varejo', 'e-commerce', 'distribuidoras'],
        relevanceScore: 83,
        status: 'VALIDATED',
      },
    }),
    prisma.painLibraryEntry.upsert({
      where: { id: 'dev-pain-014' },
      update: {},
      create: {
        id: 'dev-pain-014',
        title: 'Múltiplas ferramentas SaaS desconectadas (SaaS bloat)',
        description: 'Empresa paga 5-10 assinaturas mensais de ferramentas que não se integram. Dados em silos, custos crescentes, e nenhuma visão unificada. TCO de SaaS supera software personalizado em 2-3 anos.',
        sectors: ['startups', 'agências', 'consultorias'],
        relevanceScore: 81,
        status: 'VALIDATED',
      },
    }),
    prisma.painLibraryEntry.upsert({
      where: { id: 'dev-pain-015' },
      update: {},
      create: {
        id: 'dev-pain-015',
        title: 'Baixa previsibilidade de receita e produção',
        description: 'Sem sistema de pipeline, gestor não sabe quantas vendas vai fechar no mês nem quanto precisa produzir. Planejamento financeiro baseado em achismo. Fluxo de caixa oscila 40-60% entre meses.',
        sectors: ['serviços B2B', 'indústria', 'agronegócio'],
        relevanceScore: 88,
        status: 'VALIDATED',
      },
    }),
  ])
  console.log(`  ✓ PainLibraryEntries: ${pains.length}`)

  // ─── CaseLibraryEntries (8) — Cases reais de projetos SystemForge ─────────
  const cases = await Promise.all([
    prisma.caseLibraryEntry.upsert({
      where: { id: 'dev-case-001' },
      update: {},
      create: {
        id: 'dev-case-001',
        name: 'Clínica de fisioterapia — sistema de agendamento e prontuário eletrônico',
        sector: 'saúde',
        systemType: 'gestão-clinica',
        outcome: 'Reduziu no-show de pacientes em 40% com lembretes automatizados. Tempo de atendimento administrativo caiu de 15min para 3min por paciente. ROI positivo em 4 meses.',
        hasQuantifiableResult: true,
        status: 'VALIDATED',
      },
    }),
    prisma.caseLibraryEntry.upsert({
      where: { id: 'dev-case-002' },
      update: {},
      create: {
        id: 'dev-case-002',
        name: 'Distribuidora de alimentos — gestão de pedidos e rota de entrega',
        sector: 'distribuição',
        systemType: 'gestão-pedidos',
        outcome: 'Automatizou 100% da captação de pedidos (antes via WhatsApp). Faturamento cresceu 35% em 6 meses pela eliminação de pedidos perdidos. Erros de digitação caíram de 8% para 0.3%.',
        hasQuantifiableResult: true,
        status: 'VALIDATED',
      },
    }),
    prisma.caseLibraryEntry.upsert({
      where: { id: 'dev-case-003' },
      update: {},
      create: {
        id: 'dev-case-003',
        name: 'Escritório de advocacia — automação de petições e controle de prazos',
        sector: 'jurídico',
        systemType: 'legaltech',
        outcome: 'Produtividade dos advogados aumentou 60%. Sistema gera minutas automaticamente a partir de modelos validados. Zero prazos perdidos desde a implementação (antes: 2-3 por trimestre).',
        hasQuantifiableResult: true,
        status: 'VALIDATED',
      },
    }),
    prisma.caseLibraryEntry.upsert({
      where: { id: 'dev-case-004' },
      update: {},
      create: {
        id: 'dev-case-004',
        name: 'Construtora — orçamento digital e acompanhamento de obra',
        sector: 'construção civil',
        systemType: 'gestão-obras',
        outcome: 'Tempo de elaboração de orçamento caiu de 3 dias para 2 horas. Economia de 25% em compras por controle preciso de estoque de materiais. Relatórios de progresso automáticos para o cliente.',
        hasQuantifiableResult: true,
        status: 'VALIDATED',
      },
    }),
    prisma.caseLibraryEntry.upsert({
      where: { id: 'dev-case-005' },
      update: {},
      create: {
        id: 'dev-case-005',
        name: 'Startup fintech — MVP de gestão financeira para PMEs',
        sector: 'fintech',
        systemType: 'mvp-saas',
        outcome: 'MVP entregue em 45 dias com metodologia documentation-first. Startup captou R$ 500k em rodada seed com o produto funcionando. Base de 200 usuários ativos em 3 meses após lançamento.',
        hasQuantifiableResult: true,
        status: 'VALIDATED',
      },
    }),
    prisma.caseLibraryEntry.upsert({
      where: { id: 'dev-case-006' },
      update: {},
      create: {
        id: 'dev-case-006',
        name: 'E-commerce de moda — integração multi-canal e gestão unificada',
        sector: 'e-commerce',
        systemType: 'integração-multicanal',
        outcome: 'Integrou Shopify, Mercado Livre e loja própria em painel único. Vendas cresceram 45% pela eliminação de ruptura de estoque. Tempo de processamento de pedidos caiu 70%.',
        hasQuantifiableResult: true,
        status: 'VALIDATED',
      },
    }),
    prisma.caseLibraryEntry.upsert({
      where: { id: 'dev-case-007' },
      update: {},
      create: {
        id: 'dev-case-007',
        name: 'Consultoria de RH — plataforma de recrutamento e seleção',
        sector: 'recursos humanos',
        systemType: 'plataforma-recrutamento',
        outcome: 'Time-to-hire reduziu 55% (de 40 dias para 18 dias). Candidatos triados automaticamente por critérios definidos pelo cliente. NPS de empresas contratantes subiu de 7.2 para 9.1.',
        hasQuantifiableResult: true,
        status: 'VALIDATED',
      },
    }),
    prisma.caseLibraryEntry.upsert({
      where: { id: 'dev-case-008' },
      update: {},
      create: {
        id: 'dev-case-008',
        name: 'Rede de academias — sistema de gestão de alunos e pagamentos',
        sector: 'fitness',
        systemType: 'gestão-academias',
        outcome: 'Inadimplência caiu de 22% para 8% com cobrança automatizada. Check-in por QR code eliminou filas na recepção. Retenção de alunos subiu 30% com engajamento automatizado.',
        hasQuantifiableResult: true,
        status: 'VALIDATED',
      },
    }),
  ])
  console.log(`  ✓ CaseLibraryEntries: ${cases.length}`)

  // ─── Themes (10) — Temas de conteúdo para atrair clientes de software sob medida ───
  const themes = await Promise.all([
    prisma.theme.upsert({
      where: { id: 'dev-theme-001' },
      update: {},
      create: {
        id: 'dev-theme-001',
        title: 'Como um sistema sob medida elimina 20h/semana de retrabalho operacional',
        opportunityScore: 9.2,
        conversionScore: 92,
        painRelevanceScore: 95,
        caseStrengthScore: 88,
        geoMultiplier: 1.2,
        recencyBonus: 1.0,
        status: 'ACTIVE',
        isNew: false,
        painId: 'dev-pain-001',
        caseId: 'dev-case-002',
      },
    }),
    prisma.theme.upsert({
      where: { id: 'dev-theme-002' },
      update: {},
      create: {
        id: 'dev-theme-002',
        title: 'Por que sua planilha de vendas está te custando clientes todos os dias',
        opportunityScore: 8.8,
        conversionScore: 88,
        painRelevanceScore: 92,
        caseStrengthScore: 84,
        geoMultiplier: 1.0,
        recencyBonus: 1.0,
        status: 'ACTIVE',
        isNew: true,
        painId: 'dev-pain-002',
        caseId: 'dev-case-004',
      },
    }),
    prisma.theme.upsert({
      where: { id: 'dev-theme-003' },
      update: {},
      create: {
        id: 'dev-theme-003',
        title: 'Case: clínica reduziu no-show em 40% com sistema próprio de agendamento',
        opportunityScore: 9.5,
        conversionScore: 95,
        painRelevanceScore: 88,
        caseStrengthScore: 98,
        geoMultiplier: 1.2,
        recencyBonus: 1.0,
        status: 'ACTIVE',
        isNew: false,
        painId: 'dev-pain-006',
        caseId: 'dev-case-001',
      },
    }),
    prisma.theme.upsert({
      where: { id: 'dev-theme-004' },
      update: {},
      create: {
        id: 'dev-theme-004',
        title: 'Quanto custa (de verdade) um software personalizado em 2026',
        opportunityScore: 9.0,
        conversionScore: 90,
        painRelevanceScore: 85,
        caseStrengthScore: 80,
        geoMultiplier: 1.2,
        recencyBonus: 1.0,
        status: 'ACTIVE',
        isNew: true,
        painId: 'dev-pain-014',
      },
    }),
    prisma.theme.upsert({
      where: { id: 'dev-theme-005' },
      update: {},
      create: {
        id: 'dev-theme-005',
        title: '5 sinais de que sua empresa precisa de um sistema próprio (e não mais um SaaS)',
        opportunityScore: 8.5,
        conversionScore: 85,
        painRelevanceScore: 88,
        caseStrengthScore: 82,
        geoMultiplier: 1.0,
        recencyBonus: 1.0,
        status: 'ACTIVE',
        isNew: false,
        painId: 'dev-pain-014',
      },
    }),
    prisma.theme.upsert({
      where: { id: 'dev-theme-006' },
      update: {},
      create: {
        id: 'dev-theme-006',
        title: 'Construir vs. Comprar: quando SaaS genérico para de resolver e começa a atrapalhar',
        opportunityScore: 8.2,
        conversionScore: 82,
        painRelevanceScore: 80,
        caseStrengthScore: 78,
        geoMultiplier: 1.0,
        recencyBonus: 1.0,
        status: 'ACTIVE',
        isNew: false,
        painId: 'dev-pain-004',
      },
    }),
    prisma.theme.upsert({
      where: { id: 'dev-theme-007' },
      update: {},
      create: {
        id: 'dev-theme-007',
        title: 'Como a metodologia documentation-first evita que 35% dos projetos de software fracassem',
        opportunityScore: 8.7,
        conversionScore: 87,
        painRelevanceScore: 82,
        caseStrengthScore: 90,
        geoMultiplier: 1.0,
        recencyBonus: 1.0,
        status: 'ACTIVE',
        isNew: true,
        painId: 'dev-pain-009',
        caseId: 'dev-case-005',
      },
    }),
    prisma.theme.upsert({
      where: { id: 'dev-theme-008' },
      update: {},
      create: {
        id: 'dev-theme-008',
        title: 'MVP em 30 dias: como validar sua ideia de sistema sem gastar R$ 100 mil',
        opportunityScore: 9.1,
        conversionScore: 91,
        painRelevanceScore: 86,
        caseStrengthScore: 94,
        geoMultiplier: 1.2,
        recencyBonus: 1.0,
        status: 'ACTIVE',
        isNew: true,
        painId: 'dev-pain-009',
        caseId: 'dev-case-005',
      },
    }),
    prisma.theme.upsert({
      where: { id: 'dev-theme-009' },
      update: {},
      create: {
        id: 'dev-theme-009',
        title: 'O erro mais caro da PME: depender de WhatsApp para gestão comercial',
        opportunityScore: 8.6,
        conversionScore: 86,
        painRelevanceScore: 90,
        caseStrengthScore: 82,
        geoMultiplier: 1.0,
        recencyBonus: 0.5,
        status: 'ACTIVE',
        isNew: false,
        painId: 'dev-pain-003',
        caseId: 'dev-case-002',
      },
    }),
    prisma.theme.upsert({
      where: { id: 'dev-theme-010' },
      update: {},
      create: {
        id: 'dev-theme-010',
        title: 'LGPD na prática: por que seu sistema precisa estar em compliance antes da ANPD bater na porta',
        opportunityScore: 7.8,
        conversionScore: 78,
        painRelevanceScore: 80,
        caseStrengthScore: 72,
        geoMultiplier: 1.0,
        recencyBonus: 1.0,
        status: 'ACTIVE',
        isNew: false,
        painId: 'dev-pain-012',
      },
    }),
    // Theme REJECTED — tema fora do posicionamento
    prisma.theme.upsert({
      where: { id: 'dev-theme-011' },
      update: {},
      create: {
        id: 'dev-theme-011',
        title: 'Como usar IA para gerar código automaticamente sem desenvolvedor',
        opportunityScore: 3.2,
        conversionScore: 32,
        painRelevanceScore: 40,
        caseStrengthScore: 20,
        geoMultiplier: 1.0,
        recencyBonus: 0.0,
        status: 'REJECTED',
        rejectionReason: 'Contradiz o posicionamento: SystemForge vende expertise em desenvolvimento, não substituição de desenvolvedores. Tema atrai público errado (DIY) em vez de decisores que querem contratar.',
        rejectedAt: new Date(Date.now() - 7 * 86400000),
        rejectedBy: 'operator',
        isNew: false,
      },
    }),
    // Theme DEPRIORITIZED — muito amplo
    prisma.theme.upsert({
      where: { id: 'dev-theme-012' },
      update: {},
      create: {
        id: 'dev-theme-012',
        title: 'Tendências de tecnologia para empresas em 2026',
        opportunityScore: 4.5,
        conversionScore: 45,
        painRelevanceScore: 50,
        caseStrengthScore: 35,
        geoMultiplier: 1.0,
        recencyBonus: 0.5,
        status: 'DEPRIORITIZED',
        rejectionReason: 'Tema genérico demais, sem conexão direta com dor operacional. Gera visualizações mas não leads qualificados. Precisa ser nichado (ex: tendências para distribuidoras).',
        isNew: false,
        painId: 'dev-pain-009',
      },
    }),
  ])
  console.log(`  ✓ Themes: ${themes.length} (10 ACTIVE, 1 REJECTED, 1 DEPRIORITIZED)`)

  // ─── ImageTemplates (7) — Templates visuais para conteúdo SystemForge ──────
  const templates = await Promise.all([
    prisma.imageTemplate.upsert({
      where: { id: 'dev-tpl-001' },
      update: {},
      create: {
        id: 'dev-tpl-001',
        imageType: 'CAROUSEL',
        name: 'Carrossel LinkedIn — SystemForge Azul Corporativo',
        width: 1080,
        height: 1080,
        description: 'Template para carrosséis LinkedIn com identidade visual SystemForge. Fundo escuro (#1a1a2e), texto branco, destaque azul (#0ea5e9).',
        isActive: true,
        backgroundNeedsText: false,
      },
    }),
    prisma.imageTemplate.upsert({
      where: { id: 'dev-tpl-002' },
      update: {},
      create: {
        id: 'dev-tpl-002',
        imageType: 'STATIC',
        name: 'Post Instagram — Case Study Card',
        width: 1080,
        height: 1080,
        description: 'Card de case study para Instagram: antes/depois com métricas. Fundo branco, tipografia bold.',
        isActive: true,
        backgroundNeedsText: true,
      },
    }),
    prisma.imageTemplate.upsert({
      where: { id: 'dev-tpl-003' },
      update: {},
      create: {
        id: 'dev-tpl-003',
        imageType: 'STATIC',
        name: 'Banner Blog — OG Image SystemForge',
        width: 1200,
        height: 630,
        description: 'Banner Open Graph para artigos do blog. Gradiente escuro com logo SystemForge, título em destaque.',
        isActive: true,
        backgroundNeedsText: false,
      },
    }),
    prisma.imageTemplate.upsert({
      where: { id: 'dev-tpl-004' },
      update: {},
      create: {
        id: 'dev-tpl-004',
        imageType: 'CAROUSEL',
        name: 'Carrossel Instagram — Passo a Passo Dark Mode',
        width: 1080,
        height: 1350,
        description: 'Carrossel Instagram 4:5 para tutoriais e processos. Numeração de slides, fundo escuro, ícones de etapa.',
        isActive: true,
        backgroundNeedsText: false,
      },
    }),
    prisma.imageTemplate.upsert({
      where: { id: 'dev-tpl-005' },
      update: {},
      create: {
        id: 'dev-tpl-005',
        imageType: 'STATIC',
        name: 'Quote Card LinkedIn — Insight Técnico',
        width: 1200,
        height: 628,
        description: 'Card de citação para LinkedIn com insight técnico do Pedro. Gradiente azul, aspas grandes.',
        isActive: true,
        backgroundNeedsText: false,
      },
    }),
    prisma.imageTemplate.upsert({
      where: { id: 'dev-tpl-006' },
      update: {},
      create: {
        id: 'dev-tpl-006',
        imageType: 'BEFORE_AFTER',
        name: 'Before/After — Transformação Digital',
        width: 1080,
        height: 1080,
        description: 'Comparativo visual antes/depois de implementação. Lado esquerdo: caótico (planilhas, WhatsApp). Lado direito: dashboard organizado.',
        isActive: true,
        backgroundNeedsText: true,
      },
    }),
    prisma.imageTemplate.upsert({
      where: { id: 'dev-tpl-007' },
      update: {},
      create: {
        id: 'dev-tpl-007',
        imageType: 'ERROR_CARD',
        name: 'Error Card — Erros Comuns de PMEs',
        width: 1080,
        height: 1080,
        description: 'Card de erro comum com ícone de alerta vermelho. Usado para posts "5 erros que...", "Por que não funciona...".',
        isActive: true,
        backgroundNeedsText: true,
      },
    }),
  ])
  console.log(`  ✓ ImageTemplates: ${templates.length}`)

  // ─── SolutionPatterns (6) — Padrões de solução SystemForge ─────────────────
  const patterns = await Promise.all([
    prisma.solutionPattern.upsert({
      where: { id: 'dev-pattern-001' },
      update: {},
      create: {
        id: 'dev-pattern-001',
        name: 'Dashboard operacional com métricas em tempo real',
        description: 'Sistema web com painel de controle que consolida dados de múltiplas fontes, exibe KPIs em tempo real e gera relatórios automáticos. Elimina a necessidade de relatórios manuais e dá visibilidade instantânea ao gestor.',
        painId: 'dev-pain-005',
        caseId: 'dev-case-002',
      },
    }),
    prisma.solutionPattern.upsert({
      where: { id: 'dev-pattern-002' },
      update: {},
      create: {
        id: 'dev-pattern-002',
        name: 'Automação de orçamentos e propostas comerciais',
        description: 'Sistema que gera orçamentos automaticamente a partir de templates e tabelas de preço atualizadas. Integra com CRM para rastrear pipeline. Reduz tempo de proposta de horas para minutos.',
        painId: 'dev-pain-008',
        caseId: 'dev-case-004',
      },
    }),
    prisma.solutionPattern.upsert({
      where: { id: 'dev-pattern-003' },
      update: {},
      create: {
        id: 'dev-pattern-003',
        name: 'Sistema de agendamento com lembretes automatizados',
        description: 'Plataforma de agendamento online com confirmação automática por WhatsApp/SMS. Controle de agenda por profissional, gestão de cancelamentos e lista de espera. Reduz no-show em 30-50%.',
        painId: 'dev-pain-006',
        caseId: 'dev-case-001',
      },
    }),
    prisma.solutionPattern.upsert({
      where: { id: 'dev-pattern-004' },
      update: {},
      create: {
        id: 'dev-pattern-004',
        name: 'Plataforma de gestão de pedidos com integração multi-canal',
        description: 'Sistema centralizado que recebe pedidos de WhatsApp, site, marketplace e vendedor externo. Gera picking list, controla estoque e rastreia entregas. Elimina pedidos perdidos e duplicados.',
        painId: 'dev-pain-003',
        caseId: 'dev-case-002',
      },
    }),
    prisma.solutionPattern.upsert({
      where: { id: 'dev-pattern-005' },
      update: {},
      create: {
        id: 'dev-pattern-005',
        name: 'MVP de validação rápida com metodologia documentation-first',
        description: 'Entrega de MVP funcional em 30-45 dias usando SystemForge: documentação completa antes do código, sprints curtos, entrega incremental. Ideal para startups validando produto antes de captar investimento.',
        painId: 'dev-pain-009',
        caseId: 'dev-case-005',
      },
    }),
    prisma.solutionPattern.upsert({
      where: { id: 'dev-pattern-006' },
      update: {},
      create: {
        id: 'dev-pattern-006',
        name: 'Automação de processos jurídicos e controle de prazos',
        description: 'Sistema para escritórios de advocacia que automatiza geração de petições, controla prazos processuais com alertas, gerencia documentos e relaciona processos a clientes.',
        painId: 'dev-pain-001',
        caseId: 'dev-case-003',
      },
    }),
  ])
  console.log(`  ✓ SolutionPatterns: ${patterns.length}`)

  // ─── Objections (12) — Objeções reais do mercado brasileiro ────────────────
  const objections = await Promise.all([
    prisma.objection.upsert({ where: { id: 'dev-obj-001' }, update: {}, create: { id: 'dev-obj-001', content: 'Software personalizado é muito caro — não temos orçamento para isso', type: 'PRICE', status: 'VALIDATED' } }),
    prisma.objection.upsert({ where: { id: 'dev-obj-002' }, update: {}, create: { id: 'dev-obj-002', content: 'Já tentamos desenvolver um sistema com outra empresa e o projeto fracassou', type: 'TRUST', status: 'VALIDATED' } }),
    prisma.objection.upsert({ where: { id: 'dev-obj-003' }, update: {}, create: { id: 'dev-obj-003', content: 'Não é o momento certo para investir em tecnologia — estamos focando em vendas', type: 'TIMING', status: 'VALIDATED' } }),
    prisma.objection.upsert({ where: { id: 'dev-obj-004' }, update: {}, create: { id: 'dev-obj-004', content: 'Não temos equipe técnica interna para manter o sistema depois', type: 'NEED', status: 'VALIDATED' } }),
    prisma.objection.upsert({ where: { id: 'dev-obj-005' }, update: {}, create: { id: 'dev-obj-005', content: 'Podemos usar Salesforce/Totvs/ERPpronto — para que desenvolver do zero?', type: 'TRUST', status: 'VALIDATED' } }),
    prisma.objection.upsert({ where: { id: 'dev-obj-006' }, update: {}, create: { id: 'dev-obj-006', content: 'Vai demorar muito para ficar pronto — precisamos de resultado agora', type: 'TIMING', status: 'VALIDATED' } }),
    prisma.objection.upsert({ where: { id: 'dev-obj-007' }, update: {}, create: { id: 'dev-obj-007', content: 'E se o desenvolvedor sumir no meio do projeto? Fico sem nada', type: 'TRUST', status: 'VALIDATED' } }),
    prisma.objection.upsert({ where: { id: 'dev-obj-008' }, update: {}, create: { id: 'dev-obj-008', content: 'Nosso negócio é simples demais para justificar um sistema personalizado', type: 'NEED', status: 'VALIDATED' } }),
    prisma.objection.upsert({ where: { id: 'dev-obj-009' }, update: {}, create: { id: 'dev-obj-009', content: 'Preferimos investir em marketing/vendas agora, tecnologia fica para depois', type: 'PRICE', status: 'VALIDATED' } }),
    prisma.objection.upsert({ where: { id: 'dev-obj-010' }, update: {}, create: { id: 'dev-obj-010', content: 'Quem decide aqui não entende de tecnologia — difícil aprovar esse investimento', type: 'AUTHORITY', status: 'VALIDATED' } }),
    prisma.objection.upsert({ where: { id: 'dev-obj-011' }, update: {}, create: { id: 'dev-obj-011', content: 'Não sei se vai ter ROI suficiente para justificar o investimento', type: 'PRICE', status: 'DRAFT' } }),
    prisma.objection.upsert({ where: { id: 'dev-obj-012' }, update: {}, create: { id: 'dev-obj-012', content: 'Já usamos Excel e funciona — por que mudar?', type: 'NEED', status: 'VALIDATED' } }),
  ])
  console.log(`  ✓ Objections: ${objections.length}`)

  // ─── NicheOpportunities (8) — Nichos brasileiros com alta demanda ──────────
  const niches = await Promise.all([
    prisma.nicheOpportunity.upsert({ where: { id: 'dev-niche-001' }, update: {}, create: { id: 'dev-niche-001', sector: 'Clínicas e consultórios médicos', painCategory: 'Agendamento, prontuário e LGPD', potentialScore: 9.3, isGeoReady: true } }),
    prisma.nicheOpportunity.upsert({ where: { id: 'dev-niche-002' }, update: {}, create: { id: 'dev-niche-002', sector: 'Escritórios de advocacia', painCategory: 'Automação jurídica e controle de prazos', potentialScore: 8.8, isGeoReady: true } }),
    prisma.nicheOpportunity.upsert({ where: { id: 'dev-niche-003' }, update: {}, create: { id: 'dev-niche-003', sector: 'Construtoras e incorporadoras', painCategory: 'Orçamento digital e gestão de obra', potentialScore: 8.5, isGeoReady: true } }),
    prisma.nicheOpportunity.upsert({ where: { id: 'dev-niche-004' }, update: {}, create: { id: 'dev-niche-004', sector: 'Distribuidoras de alimentos e bebidas', painCategory: 'Gestão de pedidos e logística', potentialScore: 9.0, isGeoReady: true } }),
    prisma.nicheOpportunity.upsert({ where: { id: 'dev-niche-005' }, update: {}, create: { id: 'dev-niche-005', sector: 'Academias e estúdios fitness', painCategory: 'Gestão de alunos e cobrança', potentialScore: 7.8, isGeoReady: true } }),
    prisma.nicheOpportunity.upsert({ where: { id: 'dev-niche-006' }, update: {}, create: { id: 'dev-niche-006', sector: 'Franquias em expansão', painCategory: 'Sistema de gestão multi-unidade', potentialScore: 8.7, isGeoReady: false } }),
    prisma.nicheOpportunity.upsert({ where: { id: 'dev-niche-007' }, update: {}, create: { id: 'dev-niche-007', sector: 'Startups early-stage (pré-seed/seed)', painCategory: 'MVP rápido para validação e captação', potentialScore: 9.2, isGeoReady: false } }),
    prisma.nicheOpportunity.upsert({ where: { id: 'dev-niche-008' }, update: {}, create: { id: 'dev-niche-008', sector: 'Agronegócio (fazendas e cooperativas)', painCategory: 'Monitoramento de safra e gestão', potentialScore: 8.2, isGeoReady: true } }),
  ])
  console.log(`  ✓ NicheOpportunities: ${niches.length}`)

  // ─── ContentPieces (12) — Conteúdos sobre software sob medida + SystemForge ─
  const pieces = await Promise.all([
    // AWARENESS — LinkedIn carrossel sobre retrabalho
    prisma.contentPiece.upsert({ where: { id: 'dev-piece-001' }, update: {}, create: { id: 'dev-piece-001', themeId: 'dev-theme-001', baseTitle: 'Como um sistema sob medida elimina 20h/semana de retrabalho', painCategory: 'processos manuais', targetNiche: 'PMEs operacionais', relatedService: 'automação de processos', funnelStage: 'AWARENESS', idealFormat: 'carrossel', recommendedChannel: 'LINKEDIN', ctaDestination: 'WHATSAPP', status: 'APPROVED', selectedAngle: 'CONSULTIVE' } }),
    // AWARENESS — Instagram post sobre planilhas
    prisma.contentPiece.upsert({ where: { id: 'dev-piece-002' }, update: {}, create: { id: 'dev-piece-002', themeId: 'dev-theme-002', baseTitle: 'Sua planilha está te custando clientes — e você nem sabe', painCategory: 'planilhas', targetNiche: 'varejo e distribuição', relatedService: 'sistema de gestão', funnelStage: 'AWARENESS', idealFormat: 'post estático', recommendedChannel: 'INSTAGRAM', ctaDestination: 'BLOG', status: 'DRAFT' } }),
    // CONSIDERATION — Blog sobre custos
    prisma.contentPiece.upsert({ where: { id: 'dev-piece-003' }, update: {}, create: { id: 'dev-piece-003', themeId: 'dev-theme-004', baseTitle: 'Quanto custa um software personalizado em 2026: guia com valores reais', painCategory: 'investimento', targetNiche: 'decisores PME', relatedService: 'desenvolvimento sob medida', funnelStage: 'CONSIDERATION', idealFormat: 'artigo longo', recommendedChannel: 'BLOG', ctaDestination: 'CONTACT_FORM', status: 'REVIEW' } }),
    // DECISION — Case study LinkedIn
    prisma.contentPiece.upsert({ where: { id: 'dev-piece-004' }, update: {}, create: { id: 'dev-piece-004', themeId: 'dev-theme-003', baseTitle: 'Case: clínica de fisioterapia reduziu no-show em 40%', painCategory: 'agendamento', targetNiche: 'clínicas e consultórios', relatedService: 'sistema de agendamento', funnelStage: 'DECISION', idealFormat: 'carrossel', recommendedChannel: 'LINKEDIN', ctaDestination: 'WHATSAPP', status: 'PUBLISHED' } }),
    // AWARENESS — LinkedIn sobre WhatsApp comercial
    prisma.contentPiece.upsert({ where: { id: 'dev-piece-005' }, update: {}, create: { id: 'dev-piece-005', themeId: 'dev-theme-009', baseTitle: 'O erro mais caro: depender de WhatsApp para gestão comercial', painCategory: 'gestão comercial', targetNiche: 'serviços B2B', relatedService: 'CRM personalizado', funnelStage: 'AWARENESS', idealFormat: 'texto nativo', recommendedChannel: 'LINKEDIN', ctaDestination: 'WHATSAPP', status: 'APPROVED' } }),
    // CONSIDERATION — Build vs Buy
    prisma.contentPiece.upsert({ where: { id: 'dev-piece-006' }, update: {}, create: { id: 'dev-piece-006', themeId: 'dev-theme-006', baseTitle: 'Construir vs. Comprar: quando SaaS genérico começa a atrapalhar', painCategory: 'SaaS bloat', targetNiche: 'startups e scale-ups', relatedService: 'consultoria técnica', funnelStage: 'CONSIDERATION', idealFormat: 'artigo longo', recommendedChannel: 'BLOG', ctaDestination: 'CONTACT_FORM', status: 'DRAFT' } }),
    // AWARENESS — Metodologia documentation-first
    prisma.contentPiece.upsert({ where: { id: 'dev-piece-007' }, update: {}, create: { id: 'dev-piece-007', themeId: 'dev-theme-007', baseTitle: 'Por que 35% dos projetos de software fracassam (e como evitar)', painCategory: 'risco de projeto', targetNiche: 'CTOs e gestores', relatedService: 'metodologia SystemForge', funnelStage: 'AWARENESS', idealFormat: 'carrossel', recommendedChannel: 'LINKEDIN', ctaDestination: 'BLOG', status: 'REVIEW' } }),
    // DECISION — MVP rápido
    prisma.contentPiece.upsert({ where: { id: 'dev-piece-008' }, update: {}, create: { id: 'dev-piece-008', themeId: 'dev-theme-008', baseTitle: 'MVP em 30 dias: como validar sua ideia sem gastar R$ 100 mil', painCategory: 'validação de produto', targetNiche: 'founders e empreendedores', relatedService: 'MVP sob medida', funnelStage: 'DECISION', idealFormat: 'artigo longo', recommendedChannel: 'BLOG', ctaDestination: 'WHATSAPP', status: 'SCHEDULED' } }),
    // AWARENESS — 5 sinais Instagram
    prisma.contentPiece.upsert({ where: { id: 'dev-piece-009' }, update: {}, create: { id: 'dev-piece-009', themeId: 'dev-theme-005', baseTitle: '5 sinais de que sua empresa precisa de sistema próprio', painCategory: 'diagnóstico', targetNiche: 'donos de PME', relatedService: 'diagnóstico gratuito', funnelStage: 'AWARENESS', idealFormat: 'carrossel', recommendedChannel: 'INSTAGRAM', ctaDestination: 'WHATSAPP', status: 'APPROVED' } }),
    // CONSIDERATION — LGPD Blog
    prisma.contentPiece.upsert({ where: { id: 'dev-piece-010' }, update: {}, create: { id: 'dev-piece-010', themeId: 'dev-theme-010', baseTitle: 'LGPD para PMEs: o que você precisa fazer antes que a ANPD bata na porta', painCategory: 'compliance', targetNiche: 'clínicas e escritórios', relatedService: 'adequação LGPD', funnelStage: 'CONSIDERATION', idealFormat: 'artigo longo', recommendedChannel: 'BLOG', ctaDestination: 'CONTACT_FORM', status: 'PENDING_ART' } }),
    // Edge: FAILED
    prisma.contentPiece.upsert({ where: { id: 'dev-piece-011' }, update: {}, create: { id: 'dev-piece-011', themeId: 'dev-theme-001', baseTitle: 'Automação de processos: guia para distribuidoras', painCategory: 'automação', targetNiche: 'distribuidoras', relatedService: 'automação', funnelStage: 'AWARENESS', idealFormat: 'infográfico', recommendedChannel: 'INSTAGRAM', ctaDestination: 'BLOG', status: 'FAILED' } }),
    // Case study distribuidora
    prisma.contentPiece.upsert({ where: { id: 'dev-piece-012' }, update: {}, create: { id: 'dev-piece-012', themeId: 'dev-theme-001', baseTitle: 'Case: distribuidora aumentou faturamento 35% com sistema de pedidos', painCategory: 'gestão de pedidos', targetNiche: 'distribuidoras', relatedService: 'sistema de pedidos', funnelStage: 'DECISION', idealFormat: 'carrossel', recommendedChannel: 'LINKEDIN', ctaDestination: 'WHATSAPP', status: 'APPROVED' } }),
  ])
  console.log(`  ✓ ContentPieces: ${pieces.length} (todos os ContentStatus cobertos)`)

  // ─── CasePain — relacionamentos entre cases e dores ────────────────────────
  const casePainLinks = [
    { caseId: 'dev-case-001', painId: 'dev-pain-006' }, // clínica → atendimento lento
    { caseId: 'dev-case-001', painId: 'dev-pain-001' }, // clínica → processos manuais
    { caseId: 'dev-case-002', painId: 'dev-pain-003' }, // distribuidora → WhatsApp
    { caseId: 'dev-case-002', painId: 'dev-pain-010' }, // distribuidora → erros digitação
    { caseId: 'dev-case-002', painId: 'dev-pain-013' }, // distribuidora → estoque
    { caseId: 'dev-case-003', painId: 'dev-pain-001' }, // advocacia → processos manuais
    { caseId: 'dev-case-003', painId: 'dev-pain-007' }, // advocacia → pessoa-chave
    { caseId: 'dev-case-004', painId: 'dev-pain-008' }, // construtora → orçamento
    { caseId: 'dev-case-004', painId: 'dev-pain-002' }, // construtora → planilhas
    { caseId: 'dev-case-005', painId: 'dev-pain-009' }, // fintech → escalabilidade
    { caseId: 'dev-case-006', painId: 'dev-pain-004' }, // e-commerce → integração
    { caseId: 'dev-case-006', painId: 'dev-pain-013' }, // e-commerce → estoque
    { caseId: 'dev-case-007', painId: 'dev-pain-001' }, // RH → processos manuais
    { caseId: 'dev-case-007', painId: 'dev-pain-005' }, // RH → sem dashboards
    { caseId: 'dev-case-008', painId: 'dev-pain-015' }, // academia → receita
    { caseId: 'dev-case-008', painId: 'dev-pain-006' }, // academia → atendimento
  ]
  for (const link of casePainLinks) {
    await prisma.casePain.upsert({
      where: { caseId_painId: link },
      update: {},
      create: link,
    }).catch(() => { /* já existe */ })
  }
  console.log(`  ✓ CasePain links: ${casePainLinks.length}`)

  // ─── ScrapedTexts — amostras com todos os estados ──────────────────────────
  const operatorForScraped = await prisma.operator.findFirst({ where: { email: 'pedro@inboundforge.dev' } })
  const firstSource = await prisma.source.findFirst({ where: { operatorId: operatorForScraped?.id } })
  if (operatorForScraped && firstSource) {
    const scrapedData = [
      // Recém coletado — dor de PME sobre gestão por WhatsApp
      { id: 'dev-scraped-001', operatorId: operatorForScraped.id, sourceId: firstSource.id, rawText: 'Minha equipe comercial depende 100% do WhatsApp. Perdi 3 propostas esse mês porque o vendedor esqueceu de fazer follow-up. Preciso urgente de um CRM que funcione para o meu negócio.', url: 'https://www.reddit.com/r/brdev/comments/abc123', title: 'CRM para PME — o que vocês usam?', isPainCandidate: false, isProcessed: false, piiRemoved: false },
      // Classificado como candidato a dor
      { id: 'dev-scraped-002', operatorId: operatorForScraped.id, sourceId: firstSource.id, rawText: null, processedText: 'Empresa de distribuição perdendo pedidos por falta de sistema integrado. Usa planilha + WhatsApp + nota manual. Faturamento R$2M/ano. Dor operacional clara.', url: 'https://www.reddit.com/r/empreendedorismo/comments/def456', title: 'Distribuidora sem sistema — como vocês gerenciam?', isPainCandidate: true, isProcessed: true, piiRemoved: true, classificationResult: { label: 'pain_candidate', confidence: 0.94, category: 'gestao_pedidos' } },
      // Descartado — não relevante
      { id: 'dev-scraped-003', operatorId: operatorForScraped.id, sourceId: firstSource.id, rawText: null, processedText: 'Procurando freelancer para criar landing page simples no WordPress. Orçamento R$500.', url: 'https://www.99freelas.com.br/project/landing-page-wp', title: 'Landing page WordPress simples', isPainCandidate: false, isProcessed: true, piiRemoved: false, classificationResult: { label: 'not_relevant', confidence: 0.96 } },
      // Com TTL — LGPD compliance
      { id: 'dev-scraped-004', operatorId: operatorForScraped.id, sourceId: firstSource.id, rawText: 'Nossa clínica recebeu notificação da ANPD sobre tratamento de dados de pacientes. Estamos desesperados porque tudo está em planilha compartilhada no Google Drive sem controle de acesso.', url: 'https://www.jusbrasil.com.br/artigos/lgpd-clinicas/123456', title: 'LGPD para clínicas — urgência', isPainCandidate: true, isProcessed: false, piiRemoved: false, expiresAt: new Date(Date.now() + 30 * 86400000), batchId: 'batch-dev-2026-04-07' },
      // Dor de construtora
      { id: 'dev-scraped-005', operatorId: operatorForScraped.id, sourceId: firstSource.id, rawText: null, processedText: 'Construtora com 5 obras simultâneas sem sistema. Orçamentos feitos em Excel com erro de 15-20%. Gestor leva 3 dias para consolidar relatório de progresso. Dor operacional severa.', url: 'https://www.clubedoconcreto.com.br/forum/gestao-obras', title: 'Gestão de obras sem software', isPainCandidate: true, isProcessed: true, piiRemoved: true, classificationResult: { label: 'pain_candidate', confidence: 0.91, category: 'gestao_obras' } },
    ]
    for (const scraped of scrapedData) {
      await prisma.scrapedText.upsert({
        where: { id: scraped.id },
        update: {},
        create: scraped,
      })
    }
    console.log(`  ✓ ScrapedTexts: ${scrapedData.length} (não processado, candidato, descartado, com TTL, construtora)`)
  }

  // ─── Sub-seeds ─────────────────────────────────────────────────────────────
  // Scraping Sources (module-6)
  await seedScraping(prisma)

  // Posts, Blog, Leads, Assets (módulos 12-15)
  await seedPosts(prisma)
  await seedBlog(prisma)
  await seedLeads(prisma)
  await seedAssets(prisma)

  await markSeedComplete(prisma, 'development')
  console.log('✅ [DEV] Seed de desenvolvimento concluído — contexto SystemForge!')
}
