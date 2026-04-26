/**
 * Seed canonical da pain_library — Inbound Forge
 * Cobre as 10 categorias definidas no INTAKE (TASK-1/ST001, gap CL-172).
 * Idempotente via upsert por slug. Status=VALIDATED destrava threshold de ativacao.
 */
import type { PrismaClient } from '@prisma/client'

export interface PainLibrarySeed {
  slug: string
  title: string
  description: string
  sectors: string[]
}

export const PAIN_LIBRARY_CORE: PainLibrarySeed[] = [
  {
    slug: 'processos-manuais',
    title: 'Processos manuais limitando crescimento operacional',
    description:
      'Empresa perde 20+ horas semanais com retrabalho: copiar dados entre sistemas, conferir planilhas, gerar relatorios na mao. Cada novo funcionario multiplica o problema.',
    sectors: ['servicos B2B', 'consultoria', 'industria', 'distribuicao'],
  },
  {
    slug: 'planilhas-que-nao-escalam',
    title: 'Planilhas que nao escalam alem da equipe inicial',
    description:
      'Excel como sistema central: dados se perdem, versoes conflitam, sem controle de acesso nem auditoria. Probabilidade de erro sobe exponencialmente com o numero de editores.',
    sectors: ['varejo', 'distribuidoras', 'franquias', 'construtoras'],
  },
  {
    slug: 'falta-de-integracao',
    title: 'Sistemas e ferramentas desconectados (silos de dados)',
    description:
      'Media de 897 apps por organizacao mas apenas 29% integrados. Dados digitados 3x em sistemas diferentes. Nenhuma visao unificada do negocio.',
    sectors: ['industria', 'logistica', 'atacado', 'e-commerce'],
  },
  {
    slug: 'gestao-comercial-whatsapp',
    title: 'Orcamentacao e gestao comercial via WhatsApp sem rastreabilidade',
    description:
      'Propostas enviadas por WhatsApp sem registro centralizado. Impossivel medir taxa de conversao. Follow-up depende de memoria individual.',
    sectors: ['servicos B2B', 'construtoras', 'profissionais liberais'],
  },
  {
    slug: 'ausencia-de-dashboards',
    title: 'Ausencia de dashboards para tomada de decisao',
    description:
      'Gestor opera no escuro: relatorios manuais levam dias, dados ficam defasados. Decisoes estrategicas baseadas em intuicao.',
    sectors: ['todos os setores B2B', 'saude', 'educacao'],
  },
  {
    slug: 'atendimento-lento',
    title: 'Atendimento ao cliente lento e sem padrao',
    description:
      'Sem sistema de tickets, reclamacoes se perdem. NPS cai enquanto concorrencia digitaliza. Cada atendente inventa seu proprio processo.',
    sectors: ['clinicas', 'e-commerce', 'telecomunicacoes', 'academias'],
  },
  {
    slug: 'dependencia-pessoa-chave',
    title: 'Dependencia de pessoa-chave (risco operacional)',
    description:
      'Um funcionario concentra conhecimento critico. Se sai, a operacao para. Sem documentacao nem sistema que formalize o fluxo.',
    sectors: ['PMEs', 'escritorios contabeis', 'engenharia'],
  },
  {
    slug: 'baixa-previsibilidade',
    title: 'Baixa previsibilidade de receita e producao',
    description:
      'Sem pipeline, gestor nao sabe quantas vendas vai fechar. Planejamento financeiro baseado em achismo. Fluxo de caixa oscila 40-60% entre meses.',
    sectors: ['servicos B2B', 'industria', 'agronegocio'],
  },
  {
    slug: 'erros-humanos-digitacao',
    title: 'Erros humanos por digitacao manual repetitiva',
    description:
      'Notas fiscais, pedidos e estoque digitados a mao. Taxa de erro de 3-5% gera retrabalho, devolucoes e perda de credibilidade.',
    sectors: ['distribuidoras', 'atacado', 'industria'],
  },
  {
    slug: 'mensagens-soltas',
    title: 'Comunicacao interna/externa em mensagens soltas',
    description:
      'Decisoes importantes em threads de WhatsApp/email sem consolidacao. Rastreabilidade impossivel. Informacao relevante se perde em historicos longos.',
    sectors: ['agencias', 'consultorias', 'servicos profissionais'],
  },
]

export async function seedPainLibrary(prisma: PrismaClient) {
  const results = []
  for (const entry of PAIN_LIBRARY_CORE) {
    const id = `pain-lib-${entry.slug}`
    const saved = await prisma.painLibraryEntry.upsert({
      where: { id },
      update: {
        title: entry.title,
        description: entry.description,
        sectors: entry.sectors,
        status: 'VALIDATED',
      },
      create: {
        id,
        title: entry.title,
        description: entry.description,
        sectors: entry.sectors,
        status: 'VALIDATED',
      },
    })
    results.push(saved)
  }
  console.log(`  ✓ pain_library (canonical): ${results.length}`)
  return results
}
