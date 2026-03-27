/**
 * Seed de Categorias de Dores — Inbound Forge
 * Criado por: TASK-8 (módulo 3)
 *
 * 10 categorias de dores comuns no inbound marketing B2B.
 * Idempotente via upsert por ID.
 *
 * Uso:
 *   import { seedPainCategories } from './pain-categories.seed'
 *   await seedPainCategories(prisma)
 */
import type { PrismaClient } from '@prisma/client'

interface PainCategorySeed {
  id: string
  title: string
  description: string
  sectors: string[]
  status: 'VALIDATED'
}

const PAIN_CATEGORIES: PainCategorySeed[] = [
  {
    id: 'cat-pain-001',
    title: 'Receita imprevisível e dependência de indicações',
    description:
      'Empresas sem sistema de inbound sofrem com receita irregular, dependendo exclusivamente de indicações boca a boca e networking presencial para gerar novos negócios.',
    sectors: ['consultoria', 'serviços B2B', 'agências'],
    status: 'VALIDATED',
  },
  {
    id: 'cat-pain-002',
    title: 'Custo de aquisição de cliente insustentável',
    description:
      'CAC elevado por concentrar investimento em outbound e mídia paga sem estratégia de conteúdo orgânico que reduza custo por lead ao longo do tempo.',
    sectors: ['SaaS', 'software', 'e-commerce'],
    status: 'VALIDATED',
  },
  {
    id: 'cat-pain-003',
    title: 'Ausência de autoridade digital no mercado',
    description:
      'Sem presença de conteúdo relevante, a empresa perde credibilidade frente a concorrentes que publicam regularmente em blog, LinkedIn e redes sociais.',
    sectors: ['profissionais liberais', 'consultoria', 'coaching'],
    status: 'VALIDATED',
  },
  {
    id: 'cat-pain-004',
    title: 'Ciclo de vendas longo sem nutrição de leads',
    description:
      'Leads entram no pipeline sem conteúdo educativo que acelere a decisão de compra, resultando em follow-ups manuais extensos e baixa taxa de conversão.',
    sectors: ['tecnologia', 'serviços B2B', 'consultoria de TI'],
    status: 'VALIDATED',
  },
  {
    id: 'cat-pain-005',
    title: 'Conteúdo sem estratégia de conversão',
    description:
      'Publicações sem foco na jornada do cliente geram engajamento superficial mas não convertem em leads qualificados ou oportunidades de negócio.',
    sectors: ['agências', 'e-commerce', 'varejo'],
    status: 'VALIDATED',
  },
  {
    id: 'cat-pain-006',
    title: 'Equipe de marketing sobrecarregada sem processos',
    description:
      'Times pequenos não conseguem manter cadência de publicação por falta de processos, templates e automação, desperdiçando esforço criativo.',
    sectors: ['startups', 'scale-ups', 'PMEs'],
    status: 'VALIDATED',
  },
  {
    id: 'cat-pain-007',
    title: 'Impossibilidade de medir ROI de conteúdo',
    description:
      'Sem sistema de atribuição e analytics configurados, é impossível saber quais conteúdos geram leads, reuniões e receita efetivamente.',
    sectors: ['marketing', 'agências', 'SaaS'],
    status: 'VALIDATED',
  },
  {
    id: 'cat-pain-008',
    title: 'Posicionamento genérico sem nicho definido',
    description:
      'Conteúdo amplo demais que tenta falar com todos os públicos acaba não ressoando com nenhum segmento específico do cliente ideal.',
    sectors: ['consultoria', 'coaching', 'serviços'],
    status: 'VALIDATED',
  },
  {
    id: 'cat-pain-009',
    title: 'Dependência excessiva de plataformas de terceiros',
    description:
      'Sem blog próprio e base de email, a empresa perde audiência a cada mudança de algoritmo de redes sociais ou aumento de custo de mídia paga.',
    sectors: ['todos', 'e-commerce', 'infoprodutos'],
    status: 'VALIDATED',
  },
  {
    id: 'cat-pain-010',
    title: 'Objeções de venda não endereçadas no conteúdo',
    description:
      'O conteúdo produzido não responde objeções comuns dos prospects antes da reunião comercial, aumentando o tempo de venda e taxa de objeção ao vivo.',
    sectors: ['serviços B2B', 'SaaS', 'consultoria'],
    status: 'VALIDATED',
  },
]

export async function seedPainCategories(prisma: PrismaClient) {
  console.log('🌱 [PAIN-CATEGORIES] Inserindo categorias de dores...')

  const results = await Promise.all(
    PAIN_CATEGORIES.map((pain) =>
      prisma.painLibraryEntry.upsert({
        where: { id: pain.id },
        update: {
          title: pain.title,
          description: pain.description,
          sectors: pain.sectors,
          status: pain.status,
        },
        create: {
          id: pain.id,
          title: pain.title,
          description: pain.description,
          sectors: pain.sectors,
          status: pain.status,
        },
      })
    )
  )

  console.log(`  ✓ PainLibraryEntries (categorias): ${results.length}`)
  return results
}
