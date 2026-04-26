/**
 * Seed de Produção — Dados Pré-Validados — Inbound Forge
 * Atualizado: 2026-04-07 — Dores e templates focados em SystemForge
 *
 * SEGURANÇA (SEC-001):
 * - Email do operador lido de OPERATOR_EMAIL env var — NUNCA hardcoded
 * - Idempotente via checkSeedAlreadyRun — não re-executa
 * - Nenhum PII hardcoded neste arquivo
 */
import type { PrismaClient } from '@prisma/client'
import { upsertOperator, checkSeedAlreadyRun, markSeedComplete } from './helpers'

export async function seedProd(prisma: PrismaClient) {
  console.log('🚀 [PROD] Verificando seed de produção...')

  const alreadyRun = await checkSeedAlreadyRun(prisma, 'production')
  if (alreadyRun) {
    console.log('⏭️  [PROD] Seed de produção já executado, pulando.')
    return
  }

  const operatorEmail = process.env.OPERATOR_EMAIL
  if (!operatorEmail) {
    throw new Error('[PROD] OPERATOR_EMAIL env var é obrigatória para seed de produção')
  }

  console.log('🚀 [PROD] Iniciando seed de produção — contexto SystemForge...')

  // Operator
  const operator = await upsertOperator(prisma, operatorEmail)
  console.log(`  ✓ Operator: ${operator.email}`)

  // WorkerHealth (3 workers — IDLE ao iniciar)
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
  console.log(`  ✓ WorkerHealth: ${workers.length} workers (status: IDLE)`)

  // ─── PainLibraryEntries (15) — Dores reais de PMEs resolvíveis com software sob medida ───
  const pains = await prisma.painLibraryEntry.createMany({
    skipDuplicates: true,
    data: [
      {
        title: 'Processos operacionais manuais limitando crescimento',
        description: 'Empresa perde 20+ horas semanais com retrabalho manual: copiar dados entre sistemas, conferir planilhas, gerar relatórios na mão. Cada novo funcionário multiplica o problema.',
        sectors: ['serviços B2B', 'consultoria', 'indústria', 'distribuição'],
        status: 'VALIDATED',
      },
      {
        title: 'Planilhas que não escalam além de 5 funcionários',
        description: 'Negócio começou controlando tudo no Excel. Com crescimento, planilhas ficam lentas, dados se perdem, versões conflitam. Sem controle de acesso nem auditoria.',
        sectors: ['varejo', 'distribuidoras', 'franquias', 'construtoras'],
        status: 'VALIDATED',
      },
      {
        title: 'Gestão comercial via WhatsApp sem rastreabilidade',
        description: 'Orçamentos por WhatsApp sem registro centralizado. Impossível medir taxa de conversão. Follow-up depende de memória individual. Vendedor sai, leva o histórico.',
        sectors: ['serviços B2B', 'construtoras', 'profissionais liberais'],
        status: 'VALIDATED',
      },
      {
        title: 'Falta de integração entre ERPs e ferramentas internas',
        description: 'ERP, CRM, planilha de RH e financeiro separados. Dados digitados 3x. Média 897 apps por organização mas apenas 29% integrados.',
        sectors: ['indústria', 'logística', 'atacado', 'e-commerce'],
        status: 'VALIDATED',
      },
      {
        title: 'Ausência de dashboards para tomada de decisão',
        description: 'Gestor toma decisões baseado em intuição. Relatórios gerenciais levam dias para montar. Quando ficam prontos, dados já estão defasados.',
        sectors: ['todos os setores B2B', 'saúde', 'educação'],
        status: 'VALIDATED',
      },
      {
        title: 'Atendimento ao cliente lento por falta de automação',
        description: 'Sem sistema de tickets, reclamações se perdem. Clientes esperam horas por respostas automatizáveis. NPS cai enquanto concorrência digitaliza.',
        sectors: ['clínicas', 'e-commerce', 'telecomunicações', 'academias'],
        status: 'VALIDATED',
      },
      {
        title: 'Dependência de pessoa-chave que concentra conhecimento',
        description: 'Um funcionário é o único que sabe como funciona o processo. Se sai, operação para. Sem documentação nem sistema que formalize o fluxo.',
        sectors: ['PMEs', 'escritórios contábeis', 'engenharia'],
        status: 'VALIDATED',
      },
      {
        title: 'Orçamentação manual com erros e retrabalho constante',
        description: 'Montar orçamento leva 2-3 horas por cliente. Erros de cálculo, itens esquecidos, tabela de preços desatualizada. Cada proposta errada é venda perdida.',
        sectors: ['construtoras', 'gráficas', 'metalúrgicas', 'serviços'],
        status: 'VALIDATED',
      },
      {
        title: 'Escalabilidade travada por processos manuais',
        description: 'Demanda para crescer 3x mas não escala operação. Cada novo cliente = mais gente fazendo a mesma coisa manual. Custo operacional cresce linear.',
        sectors: ['startups', 'scale-ups', 'franquias'],
        status: 'VALIDATED',
      },
      {
        title: 'Erros em dados por digitação manual repetitiva',
        description: 'Notas fiscais, pedidos e controle de estoque digitados manualmente. Taxa de erro 3-5% gerando retrabalho, devoluções e perda de credibilidade.',
        sectors: ['distribuidoras', 'atacado', 'indústria'],
        status: 'VALIDATED',
      },
      {
        title: 'Falta de sistema próprio como diferencial competitivo',
        description: 'Concorrente com plataforma digital ganha clientes pela experiência superior. Sem sistema, empresa perde negócios por parecer artesanal demais.',
        sectors: ['agências', 'consultorias', 'serviços profissionais'],
        status: 'VALIDATED',
      },
      {
        title: 'Compliance LGPD/regulatório sem sistema adequado',
        description: 'Dados de clientes em planilhas compartilhadas sem controle de acesso. Multa LGPD até 2% do faturamento. ANPD fiscalizando clínicas, escritórios e fintechs.',
        sectors: ['saúde', 'jurídico', 'fintech', 'RH'],
        status: 'VALIDATED',
      },
      {
        title: 'Gestão de estoque/logística por planilha',
        description: 'Estoque desatualizado gera vendas de produtos indisponíveis, compras em excesso e ruptura de itens críticos. Sem integração com vendas.',
        sectors: ['varejo', 'e-commerce', 'distribuidoras'],
        status: 'VALIDATED',
      },
      {
        title: 'Múltiplas ferramentas SaaS desconectadas (SaaS bloat)',
        description: 'Empresa paga 5-10 assinaturas mensais que não se integram. TCO de SaaS supera software personalizado em 2-3 anos.',
        sectors: ['startups', 'agências', 'consultorias'],
        status: 'VALIDATED',
      },
      {
        title: 'Baixa previsibilidade de receita e produção',
        description: 'Sem pipeline digital, gestor não sabe quantas vendas vai fechar. Planejamento financeiro baseado em achismo. Fluxo de caixa oscila 40-60%.',
        sectors: ['serviços B2B', 'indústria', 'agronegócio'],
        status: 'VALIDATED',
      },
    ],
  })
  console.log(`  ✓ PainLibraryEntries: ${pains.count} registros`)

  // ─── Objections (12) — Objeções reais do mercado brasileiro ────────────
  const objections = await prisma.objection.createMany({
    skipDuplicates: true,
    data: [
      { content: 'Software personalizado é muito caro — não temos orçamento para isso', type: 'PRICE', status: 'VALIDATED' },
      { content: 'Já tentamos desenvolver um sistema com outra empresa e o projeto fracassou', type: 'TRUST', status: 'VALIDATED' },
      { content: 'Não é o momento certo para investir em tecnologia', type: 'TIMING', status: 'VALIDATED' },
      { content: 'Não temos equipe técnica interna para manter o sistema depois', type: 'NEED', status: 'VALIDATED' },
      { content: 'Podemos usar Salesforce/Totvs/ERP pronto — para que desenvolver do zero?', type: 'TRUST', status: 'VALIDATED' },
      { content: 'Vai demorar muito para ficar pronto — precisamos de resultado agora', type: 'TIMING', status: 'VALIDATED' },
      { content: 'E se o desenvolvedor sumir no meio do projeto?', type: 'TRUST', status: 'VALIDATED' },
      { content: 'Nosso negócio é simples demais para sistema personalizado', type: 'NEED', status: 'VALIDATED' },
      { content: 'Preferimos investir em marketing/vendas agora', type: 'PRICE', status: 'VALIDATED' },
      { content: 'Quem decide aqui não entende de tecnologia', type: 'AUTHORITY', status: 'VALIDATED' },
      { content: 'Não sei se vai ter ROI suficiente', type: 'PRICE', status: 'VALIDATED' },
      { content: 'Já usamos Excel e funciona — por que mudar?', type: 'NEED', status: 'VALIDATED' },
    ],
  })
  console.log(`  ✓ Objections: ${objections.count} registros`)

  // ─── ImageTemplates base por canal (7) ─────────────────────────────────
  const templates = await prisma.imageTemplate.createMany({
    skipDuplicates: true,
    data: [
      {
        imageType: 'CAROUSEL',
        name: 'Carrossel LinkedIn — SystemForge Azul Corporativo',
        width: 1080,
        height: 1080,
        description: 'Template para carrosséis LinkedIn. Fundo escuro (#1a1a2e), texto branco, destaque azul (#0ea5e9).',
        isActive: true,
      },
      {
        imageType: 'STATIC',
        name: 'Post Instagram — Case Study Card',
        width: 1080,
        height: 1080,
        description: 'Card de case study para Instagram: antes/depois com métricas.',
        isActive: true,
      },
      {
        imageType: 'STATIC',
        name: 'Banner Blog — OG Image SystemForge',
        width: 1200,
        height: 630,
        description: 'Banner Open Graph para artigos do blog. Gradiente escuro com logo.',
        isActive: true,
      },
      {
        imageType: 'CAROUSEL',
        name: 'Carrossel Instagram — Passo a Passo 4:5',
        width: 1080,
        height: 1350,
        description: 'Carrossel Instagram 4:5 para tutoriais. Numeração de slides, fundo escuro.',
        isActive: true,
      },
      {
        imageType: 'STATIC',
        name: 'Quote Card LinkedIn — Insight Técnico',
        width: 1200,
        height: 628,
        description: 'Card de citação/insight técnico para LinkedIn.',
        isActive: true,
      },
      {
        imageType: 'BEFORE_AFTER',
        name: 'Before/After — Transformação Digital',
        width: 1080,
        height: 1080,
        description: 'Comparativo visual antes/depois de implementação de sistema.',
        isActive: true,
      },
      {
        imageType: 'ERROR_CARD',
        name: 'Error Card — Erros Comuns de PMEs',
        width: 1080,
        height: 1080,
        description: 'Card de erro comum com ícone de alerta. Usado para posts "5 erros que...".',
        isActive: true,
      },
    ],
  })
  console.log(`  ✓ ImageTemplates: ${templates.count} templates`)

  await markSeedComplete(prisma, 'production')
  console.log('✅ [PROD] Seed de produção concluído — contexto SystemForge!')
}
