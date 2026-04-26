/**
 * Seed de Categorias de Dores — Inbound Forge
 * Atualizado: 2026-04-07 — Dores de PMEs que precisam de software sob medida
 *
 * 12 categorias de dores operacionais do mercado brasileiro.
 * Baseado em pesquisa: mercado de software personalizado USD 53B (2025),
 * Brasil IT +9.5% (2025), 50% das PMEs já usam software integrado (Sebrae 2025).
 *
 * Idempotente via upsert por ID.
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
    title: 'Processos manuais limitando crescimento operacional',
    description:
      'Empresa perde 20+ horas semanais com retrabalho: copiar dados entre sistemas, conferir planilhas manualmente, gerar relatórios na mão. Cada novo funcionário multiplica o problema. Custo operacional cresce linear com receita.',
    sectors: ['serviços B2B', 'consultoria', 'indústria', 'distribuição'],
    status: 'VALIDATED',
  },
  {
    id: 'cat-pain-002',
    title: 'Planilhas que não escalam além da equipe inicial',
    description:
      'Excel como sistema central: dados se perdem, versões conflitam, sem controle de acesso nem auditoria. Quando mais de 5 pessoas editam a mesma planilha, a probabilidade de erro sobe exponencialmente.',
    sectors: ['varejo', 'distribuidoras', 'franquias', 'construtoras'],
    status: 'VALIDATED',
  },
  {
    id: 'cat-pain-003',
    title: 'Gestão comercial via WhatsApp sem rastreabilidade',
    description:
      'Propostas enviadas por WhatsApp sem registro centralizado. Impossível medir taxa de conversão, follow-up depende de memória individual. Quando vendedor sai, leva todo o histórico de clientes.',
    sectors: ['serviços B2B', 'construtoras', 'profissionais liberais'],
    status: 'VALIDATED',
  },
  {
    id: 'cat-pain-004',
    title: 'Sistemas e ferramentas desconectados (silos de dados)',
    description:
      'Média de 897 apps por organização mas apenas 29% integrados. Dados digitados 3x em sistemas diferentes. Nenhuma visão unificada do negócio. Decisões baseadas em informação parcial.',
    sectors: ['indústria', 'logística', 'atacado', 'e-commerce'],
    status: 'VALIDATED',
  },
  {
    id: 'cat-pain-005',
    title: 'Ausência de dashboards para tomada de decisão',
    description:
      'Gestor opera no escuro: relatórios manuais levam dias, quando ficam prontos os dados já estão defasados. Decisões estratégicas baseadas em intuição, não em dados.',
    sectors: ['todos os setores B2B', 'saúde', 'educação'],
    status: 'VALIDATED',
  },
  {
    id: 'cat-pain-006',
    title: 'Atendimento ao cliente lento e sem padrão',
    description:
      'Sem sistema de tickets, reclamações se perdem. Clientes esperam horas por respostas automatizáveis. NPS cai enquanto concorrência digitaliza. Cada atendente inventa seu próprio processo.',
    sectors: ['clínicas', 'e-commerce', 'telecomunicações', 'academias'],
    status: 'VALIDATED',
  },
  {
    id: 'cat-pain-007',
    title: 'Dependência de pessoa-chave (risco operacional)',
    description:
      'Um funcionário concentra conhecimento crítico do processo. Se sai, a operação para. Sem documentação, sem sistema que formalize o fluxo. Risco real de paralisação.',
    sectors: ['PMEs', 'escritórios contábeis', 'engenharia'],
    status: 'VALIDATED',
  },
  {
    id: 'cat-pain-008',
    title: 'Orçamentação manual gerando erros e perda de receita',
    description:
      'Montar orçamento leva horas, erros de cálculo passam despercebidos, tabela de preços desatualizada. Cada proposta errada é venda perdida ou prejuízo absorvido.',
    sectors: ['construtoras', 'gráficas', 'metalúrgicas', 'serviços'],
    status: 'VALIDATED',
  },
  {
    id: 'cat-pain-009',
    title: 'Escalabilidade travada por falta de automação',
    description:
      'Empresa tem demanda para crescer 3x mas não escala operação. Cada novo cliente = mais gente fazendo a mesma coisa manual. Custo marginal não diminui.',
    sectors: ['startups', 'scale-ups', 'franquias', 'SaaS'],
    status: 'VALIDATED',
  },
  {
    id: 'cat-pain-010',
    title: 'Compliance LGPD/regulatório sem sistema adequado',
    description:
      'Dados de clientes em planilhas compartilhadas sem controle de acesso. Multa LGPD até 2% do faturamento. ANPD fiscalizando ativamente clínicas, escritórios e fintechs.',
    sectors: ['saúde', 'jurídico', 'fintech', 'RH'],
    status: 'VALIDATED',
  },
  {
    id: 'cat-pain-011',
    title: 'SaaS bloat: múltiplas assinaturas desconectadas',
    description:
      'Empresa paga 5-10 assinaturas SaaS que não se integram. TCO acumulado supera custo de software personalizado em 2-3 anos (Forrester 2024: 78% do TCO é pós-implantação).',
    sectors: ['startups', 'agências', 'consultorias'],
    status: 'VALIDATED',
  },
  {
    id: 'cat-pain-012',
    title: 'Falta de sistema próprio como diferencial competitivo',
    description:
      'Concorrente com plataforma digital ganha clientes pela experiência superior. Empresa sem sistema perde negócios não por preço, mas por parecer artesanal demais para clientes maiores.',
    sectors: ['agências', 'consultorias', 'serviços profissionais'],
    status: 'VALIDATED',
  },
]

export async function seedPainCategories(prisma: PrismaClient) {
  console.log('🌱 [PAIN-CATEGORIES] Inserindo categorias de dores — contexto PME brasileira...')

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
