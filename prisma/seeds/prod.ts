/**
 * Seed de Produção — Dados Pré-Validados — Inbound Forge
 * Criado por: auto-flow execute (module-1/TASK-2/ST004)
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

  // Idempotência: não re-executa se já rodou
  const alreadyRun = await checkSeedAlreadyRun(prisma, 'production')
  if (alreadyRun) {
    console.log('⏭️  [PROD] Seed de produção já executado, pulando.')
    return
  }

  // Email lido de env var (SEC-001) — nunca hardcoded
  const operatorEmail = process.env.OPERATOR_EMAIL
  if (!operatorEmail) {
    throw new Error('[PROD] OPERATOR_EMAIL env var é obrigatória para seed de produção')
  }

  console.log('🚀 [PROD] Iniciando seed de produção...')

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
      where: { type: 'PUBLISHING' },
      update: {},
      create: { type: 'PUBLISHING', status: 'IDLE' },
    }),
  ])
  console.log(`  ✓ WorkerHealth: ${workers.length} workers (status: IDLE)`)

  // PainLibraryEntries pré-validadas do nicho de Pedro (10)
  // NOTA: Estes dados foram curados por Pedro Corgnati para o nicho real de atuação
  const pains = await prisma.painLibraryEntry.createMany({
    skipDuplicates: true,
    data: [
      {
        title: 'Falta de previsibilidade de receita por dependência de indicações',
        description: 'Consultores e agências B2B dependem quase exclusivamente de indicações, sem sistema de geração previsível de novos clientes',
        sectors: ['consultoria', 'agências B2B', 'serviços B2B'],
        status: 'VALIDATED',
      },
      {
        title: 'Custo de aquisição de cliente elevado por dependência de tráfego pago',
        description: 'CAC alto por não ter canal orgânico estruturado. Cada lead custa 3-10x mais do que via inbound maduro',
        sectors: ['SaaS', 'software B2B', 'serviços recorrentes'],
        status: 'VALIDATED',
      },
      {
        title: 'Autoridade digital inexistente impede decisão de compra',
        description: 'Potencial cliente pesquisa o fornecedor e não encontra nada. Sem prova de autoridade, ciclo de venda aumenta ou negócio não fecha',
        sectors: ['todos os setores B2B'],
        status: 'VALIDATED',
      },
      {
        title: 'Ciclo de vendas longo sem conteúdo educativo',
        description: 'Leads chegam para reunião sem entender o valor do serviço. Vendedor precisa educar do zero em cada call',
        sectors: ['consultoria', 'tecnologia', 'serviços complexos'],
        status: 'VALIDATED',
      },
      {
        title: 'Conteúdo produzido sem estratégia não converte',
        description: 'Empresa publica regularmente mas sem mapeamento de jornada, ICP e objeções. Posts geram likes mas não leads',
        sectors: ['e-commerce', 'varejo', 'serviços ao consumidor'],
        status: 'VALIDATED',
      },
      {
        title: 'Equipe de marketing sobrecarregada sem automação',
        description: 'Pequenas equipes (1-3 pessoas) não conseguem manter cadência de conteúdo de qualidade sem ferramentas de apoio',
        sectors: ['startups', 'scale-ups', 'PMEs em crescimento'],
        status: 'VALIDATED',
      },
      {
        title: 'Impossibilidade de medir ROI do conteúdo',
        description: 'Empresa investe em conteúdo mas não consegue rastrear qual post gerou qual lead ou fechamento. Marketing opera no escuro',
        sectors: ['marketing B2B', 'agências', 'SaaS'],
        status: 'VALIDATED',
      },
      {
        title: 'Conteúdo genérico não ressoa com o ICP',
        description: 'Conteúdo amplo demais não fala diretamente com o cliente ideal, reduzindo relevância e conversão',
        sectors: ['consultoria especializada', 'coaching', 'profissionais liberais'],
        status: 'VALIDATED',
      },
      {
        title: 'Dependência de redes sociais sem ativos próprios',
        description: 'Sem blog ou newsletter, empresa fica refém de algoritmos e pode perder audiência a qualquer mudança de plataforma',
        sectors: ['criadores de conteúdo', 'infoprodutores', 'PMEs'],
        status: 'VALIDATED',
      },
      {
        title: 'Objeções não respondidas no conteúdo aumentam atrito de venda',
        description: 'Lead chega para reunião ainda com objeções que poderiam ter sido resolvidas previamente via conteúdo estratégico',
        sectors: ['serviços B2B', 'SaaS', 'consultorias de alto ticket'],
        status: 'VALIDATED',
      },
    ],
  })
  console.log(`  ✓ PainLibraryEntries: ${pains.count} registros`)

  // ImageTemplates base por canal (5)
  const templates = await prisma.imageTemplate.createMany({
    skipDuplicates: true,
    data: [
      {
        imageType: 'CAROUSEL',
        name: 'Carrossel LinkedIn — Padrão Inbound Forge',
        width: 1080,
        height: 1080,
        description: 'Template padrão para carrosséis LinkedIn com identidade visual do Inbound Forge',
        isActive: true,
      },
      {
        imageType: 'STATIC',
        name: 'Post Instagram — Padrão Inbound Forge',
        width: 1080,
        height: 1080,
        description: 'Template padrão para posts estáticos Instagram',
        isActive: true,
      },
      {
        imageType: 'STATIC',
        name: 'Banner Blog — OG Image',
        width: 1200,
        height: 630,
        description: 'Banner Open Graph para artigos do blog (preview em redes sociais)',
        isActive: true,
      },
      {
        imageType: 'CAROUSEL',
        name: 'Carrossel Instagram — 4:5 Padrão',
        width: 1080,
        height: 1350,
        description: 'Carrossel Instagram no formato 4:5 otimizado para feed',
        isActive: true,
      },
      {
        imageType: 'STATIC',
        name: 'Quote Card LinkedIn',
        width: 1200,
        height: 628,
        description: 'Card de citação para LinkedIn com gradiente da marca',
        isActive: true,
      },
    ],
  })
  console.log(`  ✓ ImageTemplates: ${templates.count} templates`)

  await markSeedComplete(prisma, 'production')
  console.log('✅ [PROD] Seed de produção concluído com sucesso!')
}
