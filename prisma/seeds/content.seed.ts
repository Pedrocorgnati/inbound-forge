/**
 * Seed de Conteúdo — Inbound Forge (Dev)
 * Atualizado: 2026-04-07 — Ângulos focados em software sob medida / SystemForge
 * Módulo: module-8-content-generation (TASK-0/ST003)
 *
 * Cria 3 ContentPieces referenciando temas ACTIVE, cada um com 3 ContentAngleVariants.
 * Os ângulos abordam dores de PMEs resolvíveis com software personalizado.
 * Idempotente via upsert.
 */
import type { PrismaClient } from '@prisma/client'
import {
  ContentStatus,
  ContentAngle,
  Channel,
  FunnelStage,
  CTADestination,
} from '@prisma/client'

export async function seedContent(prisma: PrismaClient): Promise<void> {
  const activeThemes = await prisma.theme.findMany({
    where: { status: 'ACTIVE' },
    take: 3,
    orderBy: { conversionScore: 'desc' },
  })

  if (activeThemes.length === 0) {
    throw new Error(
      'Nenhum tema ACTIVE encontrado — execute o seed de module-7 primeiro'
    )
  }

  const angles: ContentAngle[] = [
    ContentAngle.AGGRESSIVE,
    ContentAngle.CONSULTIVE,
    ContentAngle.AUTHORIAL,
  ]

  const angleTexts: Record<ContentAngle, { text: string; hashtags: string[] }> = {
    AGGRESSIVE: {
      text: 'Enquanto você perde 3 horas montando orçamento no Excel, seu concorrente fecha negócio em 15 minutos com sistema automatizado.\n\nCada dia sem sistema é receita perdida. Não por incompetência — por falta de ferramenta.\n\nUma construtora que atendia 5 obras em Excel tinha erro de 15-20% nos orçamentos. Resultado: prejuízo absorvido ou cliente perdido para quem parecia mais profissional.\n\nA solução não custou R$ 200 mil. Custou menos que um salário anual. E se pagou em 90 dias.\n\nA questão não é SE você precisa automatizar. É quantos clientes vai perder até fazer.',
      hashtags: ['#automação', '#PME', '#software', '#produtividade', '#construtora', '#ROI'],
    },
    CONSULTIVE: {
      text: 'Como saber se sua empresa precisa de software personalizado — checklist prático:\n\n1. Mais de 5 pessoas editam a mesma planilha\n2. Dados são digitados 2+ vezes em sistemas diferentes\n3. Você gasta R$ 3k+/mês em ferramentas SaaS que não se integram\n4. Relatórios gerenciais levam dias para ficar prontos\n5. Processo crítico depende de 1 pessoa\n\nSe marcou 3 ou mais: não é questão de "se", é "quando".\n\nO próximo passo não é contratar desenvolvimento. É fazer um diagnóstico de 30 minutos para mapear o ponto que mais dói.\n\nNa maioria das PMEs, a automação de UM processo já muda o jogo.',
      hashtags: ['#gestão', '#diagnóstico', '#PME', '#processos', '#automação', '#checklist'],
    },
    AUTHORIAL: {
      text: 'Mês passado entreguei um sistema de pedidos para uma distribuidora que gerenciava tudo por WhatsApp.\n\nO dono me disse: "Pedro, semana passada perdi um pedido de R$ 12 mil porque a mensagem ficou para baixo na conversa do vendedor."\n\nR$ 12 mil. Uma mensagem.\n\nO sistema que construí não é revolucionário. Ele faz uma coisa simples: centraliza pedidos de WhatsApp, site e vendedor externo em uma tela só. Com picking list automático e controle de estoque em tempo real.\n\nResultado em 6 meses: faturamento +35%. Zero pedidos perdidos.\n\nNão foi IA, não foi blockchain. Foi automação cirúrgica no ponto que mais doía.\n\nÉ assim que trabalho: encontro o processo que mais sangra e construo a solução mínima que resolve. Documentação primeiro, código depois.',
      hashtags: ['#case', '#distribuidora', '#resultados', '#software', '#bastidor', '#systemforge'],
    },
  }

  for (const theme of activeThemes) {
    const existing = await prisma.contentPiece.findFirst({
      where: { themeId: theme.id, funnelStage: FunnelStage.AWARENESS },
    })

    const piece = existing
      ? await prisma.contentPiece.update({
          where: { id: existing.id },
          data: { status: ContentStatus.DRAFT },
        })
      : await prisma.contentPiece.create({
          data: {
            themeId: theme.id,
            baseTitle: theme.title,
            painCategory: 'Processos operacionais',
            targetNiche: 'PMEs Brasileiras',
            relatedService: 'Software sob medida — SystemForge',
            funnelStage: FunnelStage.AWARENESS,
            idealFormat: 'post',
            recommendedChannel: Channel.LINKEDIN,
            ctaDestination: CTADestination.WHATSAPP,
            status: ContentStatus.DRAFT,
          },
        })

    for (const angle of angles) {
      const angleData = angleTexts[angle]
      const charCount = angleData.text.length
      const ctaText = 'Me chama no WhatsApp — diagnóstico gratuito de 30 min'

      const existingVariant = await prisma.contentAngleVariant.findFirst({
        where: { pieceId: piece.id, angle, generationVersion: 1 },
      })

      if (!existingVariant) {
        await prisma.contentAngleVariant.create({
          data: {
            pieceId: piece.id,
            angle,
            text: angleData.text,
            charCount,
            hashtags: angleData.hashtags,
            ctaText,
            recommendedCTA: ctaText,
            suggestedChannel: Channel.LINKEDIN,
            isSelected: angle === ContentAngle.AUTHORIAL, // Authorial converte melhor para dev solo
            generationVersion: 1,
          },
        })
      }
    }
  }

  console.log(`[seed:content] ${activeThemes.length} ContentPieces com 3 ângulos cada — contexto SystemForge`)
}
