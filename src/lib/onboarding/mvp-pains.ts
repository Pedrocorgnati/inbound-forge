/**
 * MVP Pain seeds — Intake Review TASK-2 (CL-029, CL-034)
 *
 * Fonte unica para:
 *  - rota POST /api/v1/onboarding/seed-defaults
 *  - prisma/seed-mvp-pains.ts (runner standalone)
 *  - prisma/seed.ts (seed integrado)
 *
 * 10 dores B2B-ops tipicas. Idempotente via upsert por `title`
 * (UQ_pain_library_title).
 */
import type { PrismaClient } from '@prisma/client'

export interface MvpPainSeed {
  title: string
  description: string
  sectors: string[]
  relevanceScore: number
  sortOrder: number
}

export const MVP_PAINS: MvpPainSeed[] = [
  {
    title: 'Baixa taxa de conversao pos-demo',
    description:
      'Leads qualificados que assistem a demo mas nao avancam para proposta — sintoma de discovery fraca ou copy desalinhada com a dor real.',
    sectors: ['SaaS', 'Servicos B2B'],
    relevanceScore: 85,
    sortOrder: 10,
  },
  {
    title: 'Funil opaco sem atribuicao de origem',
    description:
      'Time nao consegue dizer qual canal, conteudo ou campanha trouxe o lead — decisoes de investimento viram achismo e CAC fica invisivel.',
    sectors: ['Marketing', 'RevOps'],
    relevanceScore: 90,
    sortOrder: 20,
  },
  {
    title: 'Custo de aquisicao (CAC) em escalada',
    description:
      'Gasto por lead cresce mais rapido que a receita por cliente. Sem diagnosticar quais canais sustentam margem, a empresa subsidia crescimento caro.',
    sectors: ['Marketing', 'SaaS'],
    relevanceScore: 88,
    sortOrder: 30,
  },
  {
    title: 'Conteudo inconsistente sem linha editorial',
    description:
      'Time publica posts esporadicos, sem pilares, sem calendario e sem rastreabilidade. Resultado: SEO fraco e autoridade diluida.',
    sectors: ['Marketing', 'Content'],
    relevanceScore: 70,
    sortOrder: 40,
  },
  {
    title: 'Ciclo de vendas longo e sem previsibilidade',
    description:
      'Leads entram no pipeline e ficam meses sem avancar. Sem stages bem definidos e SLA por etapa, forecasting e chute.',
    sectors: ['Vendas', 'RevOps'],
    relevanceScore: 82,
    sortOrder: 50,
  },
  {
    title: 'Follow-up manual com perda de leads',
    description:
      'Vendas esquecem de dar retorno, mensagens somem em inbox lotada e oportunidades esfriam. Sem cadencia automatica, conversao cai.',
    sectors: ['Vendas', 'CRM'],
    relevanceScore: 78,
    sortOrder: 60,
  },
  {
    title: 'Churn alto no onboarding do cliente',
    description:
      'Clientes assinam mas abandonam antes do ahamoment. Sem milestones de ativacao e dados de uso, nao ha como intervir a tempo.',
    sectors: ['Customer Success', 'SaaS'],
    relevanceScore: 84,
    sortOrder: 70,
  },
  {
    title: 'Trafego organico estagnado ou em queda',
    description:
      'Blog/site nao cresce em sessoes qualificadas. Sem estrategia de clusters, intencao de busca e atualizacao periodica, o SEO nao acumula.',
    sectors: ['Marketing', 'SEO'],
    relevanceScore: 75,
    sortOrder: 80,
  },
  {
    title: 'ICP (perfil de cliente ideal) difuso',
    description:
      'Marketing e vendas trabalham com definicoes diferentes de cliente alvo — gera-se leads fora do ICP, cresce NO-SHOW em demos e reduz-se fechamento.',
    sectors: ['Estrategia', 'RevOps'],
    relevanceScore: 80,
    sortOrder: 90,
  },
  {
    title: 'Proposta e precificacao sem diferenciacao',
    description:
      'Time vende pelo mesmo pitch de sempre e compete por preco. Sem framework de valor nem casos por segmento, margem erode.',
    sectors: ['Vendas', 'Estrategia'],
    relevanceScore: 73,
    sortOrder: 100,
  },
]

export async function seedMvpPains(client: PrismaClient): Promise<{
  inserted: number
  existing: number
  total: number
}> {
  let inserted = 0
  let existing = 0

  for (const pain of MVP_PAINS) {
    const result = await client.painLibraryEntry.upsert({
      where: { title: pain.title },
      update: {
        isDefault: true,
        description: pain.description,
        sectors: pain.sectors,
        relevanceScore: pain.relevanceScore,
        sortOrder: pain.sortOrder,
      },
      create: {
        title: pain.title,
        description: pain.description,
        sectors: pain.sectors,
        relevanceScore: pain.relevanceScore,
        sortOrder: pain.sortOrder,
        status: 'VALIDATED',
        isDefault: true,
      },
      select: { createdAt: true, updatedAt: true },
    })
    if (result.createdAt.getTime() === result.updatedAt.getTime()) inserted++
    else existing++
  }

  return { inserted, existing, total: MVP_PAINS.length }
}
