/**
 * Seed de Conteúdo — Inbound Forge (Dev)
 * Módulo: module-8-content-generation (TASK-0/ST003)
 *
 * Cria 3 ContentPieces referenciando temas ACTIVE, cada um com 3 ContentAngleVariants.
 * Idempotente via upsert por (themeId, funnelStage).
 * imageJobId e scheduledPost são null (contratos CX-02, CX-03 respeitados).
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
  // Find active themes
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
      text: 'Você está perdendo clientes para concorrentes mais rápidos. Cada dia sem automação é receita deixada na mesa. Enquanto você faz follow-up manual, seu concorrente fecha negócios automaticamente.\n\nA solução existe. A questão é: quando você vai agir?',
      hashtags: ['#automacao', '#vendas', '#b2b', '#crm', '#produtividade'],
    },
    CONSULTIVE: {
      text: 'Como implementar automação de follow-up em 30 dias sem quebrar o relacionamento com o cliente:\n\n1. Mapeie o ciclo atual\n2. Identifique os pontos de abandono\n3. Crie sequências personalizadas por segmento\n4. Meça a taxa de resposta\n5. Itere baseado nos dados\n\nA automação bem feita aumenta (não diminui) a qualidade do contato.',
      hashtags: ['#vendas', '#automacao', '#followup', '#processos', '#b2b', '#crm'],
    },
    AUTHORIAL: {
      text: 'Um cliente nosso reduziu o ciclo de vendas de 45 para 12 dias após implementar automação de follow-up.\n\nO segredo? Não foi tecnologia. Foi processo. Mapeamos cada touchpoint, criamos conteúdo contextual e configuramos gatilhos baseados em comportamento.\n\nResultado: 3x mais fechamentos no mesmo período.',
      hashtags: ['#case', '#resultados', '#automacao', '#vendas', '#b2b'],
    },
  }

  for (const theme of activeThemes) {
    // Upsert ContentPiece
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
            painCategory: 'Automação e Processos',
            targetNiche: 'PMEs Brasileiras',
            relatedService: 'Software sob medida',
            funnelStage: FunnelStage.AWARENESS,
            idealFormat: 'post',
            recommendedChannel: Channel.LINKEDIN,
            ctaDestination: CTADestination.WHATSAPP,
            status: ContentStatus.DRAFT,
            // imageJobId null (CX-02), scheduledPost handled via Post relation (CX-03)
          },
        })

    // Create/update 3 ContentAngleVariants (one per angle)
    for (const angle of angles) {
      const angleData = angleTexts[angle]
      const charCount = angleData.text.length
      const ctaText = 'Me chama no WhatsApp para conversar sobre seu caso'

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
            isSelected: angle === ContentAngle.CONSULTIVE,
            generationVersion: 1,
          },
        })
      }
    }
  }

  console.log(`[seed:content] ${activeThemes.length} ContentPieces upserted com 3 ângulos cada`)
}
