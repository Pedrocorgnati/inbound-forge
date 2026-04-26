/**
 * Seed canonical da case_library — Inbound Forge
 * Cases validados do operador (TASK-1/ST002, gap CL-014).
 * Associa cada case a uma dor da pain_library via CasePain.
 */
import type { PrismaClient } from '@prisma/client'

interface CaseSeed {
  slug: string
  name: string
  sector: string
  systemType: string
  outcome: string
  hasQuantifiableResult: boolean
  painSlugs: string[]
}

const CASE_LIBRARY_CORE: CaseSeed[] = [
  {
    slug: 'clinica-fisio-agendamento',
    name: 'Clinica de fisioterapia — agendamento e prontuario eletronico',
    sector: 'saude',
    systemType: 'gestao-clinica',
    outcome:
      'Reduziu no-show em 40% com lembretes automatizados. Tempo administrativo caiu de 15min para 3min por paciente. ROI positivo em 4 meses.',
    hasQuantifiableResult: true,
    painSlugs: ['atendimento-lento', 'processos-manuais'],
  },
  {
    slug: 'distribuidora-pedidos',
    name: 'Distribuidora de alimentos — gestao de pedidos e rota de entrega',
    sector: 'distribuicao',
    systemType: 'gestao-pedidos',
    outcome:
      'Automatizou 100% da captacao de pedidos (antes via WhatsApp). Faturamento +35% em 6 meses. Erros de digitacao caem de 8% para 0.3%.',
    hasQuantifiableResult: true,
    painSlugs: ['gestao-comercial-whatsapp', 'erros-humanos-digitacao'],
  },
  {
    slug: 'advocacia-peticoes',
    name: 'Escritorio de advocacia — automacao de peticoes e controle de prazos',
    sector: 'juridico',
    systemType: 'legaltech',
    outcome:
      'Produtividade dos advogados +60%. Minutas geradas automaticamente. Zero prazos perdidos apos implementacao (antes: 2-3 por trimestre).',
    hasQuantifiableResult: true,
    painSlugs: ['processos-manuais', 'dependencia-pessoa-chave'],
  },
  {
    slug: 'construtora-orcamento',
    name: 'Construtora — orcamento digital e acompanhamento de obra',
    sector: 'construcao-civil',
    systemType: 'gestao-obras',
    outcome:
      'Orcamento caiu de 3 dias para 2 horas. Economia de 25% em compras. Relatorios de progresso automaticos para o cliente.',
    hasQuantifiableResult: true,
    painSlugs: ['planilhas-que-nao-escalam', 'ausencia-de-dashboards'],
  },
  {
    slug: 'startup-fintech-mvp',
    name: 'Startup fintech — MVP de gestao financeira para PMEs',
    sector: 'fintech',
    systemType: 'mvp-saas',
    outcome:
      'MVP entregue em 45 dias com metodologia documentation-first. Captou R$500k em rodada seed. 200 usuarios ativos em 3 meses.',
    hasQuantifiableResult: true,
    painSlugs: ['baixa-previsibilidade', 'falta-de-integracao'],
  },
  {
    slug: 'ecommerce-moda-multicanal',
    name: 'E-commerce de moda — integracao multi-canal',
    sector: 'e-commerce',
    systemType: 'integracao-multicanal',
    outcome:
      'Integrou Shopify, Mercado Livre e loja propria em painel unico. Vendas +45% pela eliminacao de ruptura. Processamento de pedidos -70%.',
    hasQuantifiableResult: true,
    painSlugs: ['falta-de-integracao'],
  },
]

export async function seedCaseLibrary(prisma: PrismaClient) {
  const results = []
  for (const entry of CASE_LIBRARY_CORE) {
    const id = `case-lib-${entry.slug}`
    const saved = await prisma.caseLibraryEntry.upsert({
      where: { id },
      update: {
        name: entry.name,
        sector: entry.sector,
        systemType: entry.systemType,
        outcome: entry.outcome,
        hasQuantifiableResult: entry.hasQuantifiableResult,
        status: 'VALIDATED',
      },
      create: {
        id,
        name: entry.name,
        sector: entry.sector,
        systemType: entry.systemType,
        outcome: entry.outcome,
        hasQuantifiableResult: entry.hasQuantifiableResult,
        status: 'VALIDATED',
      },
    })
    results.push(saved)

    for (const painSlug of entry.painSlugs) {
      const painId = `pain-lib-${painSlug}`
      await prisma.casePain
        .upsert({
          where: { caseId_painId: { caseId: id, painId } },
          update: {},
          create: { caseId: id, painId },
        })
        .catch(() => {
          /* pain ainda nao existe ou link duplicado */
        })
    }
  }
  console.log(`  ✓ case_library (canonical): ${results.length}`)
  return results
}
