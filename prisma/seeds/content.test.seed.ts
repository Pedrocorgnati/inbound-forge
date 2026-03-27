/**
 * Seed de Conteúdo — Test Fixtures (Inbound Forge)
 * Módulo: module-8-content-generation (TASK-0/ST003)
 *
 * Cria fixtures determinísticas para testes:
 * - 1 ContentPiece com status DRAFT (DRAFT_PIECE_ID)
 * - 1 ContentPiece com status APPROVED (APPROVED_PIECE_ID)
 * - IDs fixos (hardcoded UUIDs) para reprodutibilidade
 *
 * Idempotente via upsert por ID.
 */
import type { PrismaClient } from '@prisma/client'
import {
  ContentStatus,
  ContentAngle,
  Channel,
  FunnelStage,
  CTADestination,
} from '@prisma/client'

// ─── Deterministic IDs ────────────────────────────────────────────────────────

export const TEST_IDS = {
  // Themes (must exist from themes.test.seed.ts)
  THEME_1: '00000000-0000-0000-0000-000000000001',
  THEME_2: '00000000-0000-0000-0000-000000000002',

  // Content Pieces
  DRAFT_PIECE: '00000000-0000-0000-0000-000000000010',
  APPROVED_PIECE: '00000000-0000-0000-0000-000000000011',

  // Angle Variants for DRAFT_PIECE
  DRAFT_AGGRESSIVE: '00000000-0000-0000-0000-000000000020',
  DRAFT_CONSULTIVE: '00000000-0000-0000-0000-000000000021',
  DRAFT_AUTHORIAL: '00000000-0000-0000-0000-000000000022',

  // Angle Variants for APPROVED_PIECE
  APPROVED_AGGRESSIVE: '00000000-0000-0000-0000-000000000030',
  APPROVED_CONSULTIVE: '00000000-0000-0000-0000-000000000031',
  APPROVED_AUTHORIAL: '00000000-0000-0000-0000-000000000032',
} as const

export async function seedContentTest(prisma: PrismaClient): Promise<void> {
  // Ensure test themes exist
  await prisma.theme.upsert({
    where: { id: TEST_IDS.THEME_1 },
    update: {},
    create: {
      id: TEST_IDS.THEME_1,
      title: 'Tema de Teste — Draft',
      opportunityScore: 80,
      conversionScore: 80,
      painRelevanceScore: 80,
      caseStrengthScore: 80,
      status: 'ACTIVE',
    },
  })

  await prisma.theme.upsert({
    where: { id: TEST_IDS.THEME_2 },
    update: {},
    create: {
      id: TEST_IDS.THEME_2,
      title: 'Tema de Teste — Approved',
      opportunityScore: 90,
      conversionScore: 90,
      painRelevanceScore: 90,
      caseStrengthScore: 90,
      status: 'ACTIVE',
    },
  })

  // DRAFT ContentPiece
  await prisma.contentPiece.upsert({
    where: { id: TEST_IDS.DRAFT_PIECE },
    update: {},
    create: {
      id: TEST_IDS.DRAFT_PIECE,
      themeId: TEST_IDS.THEME_1,
      baseTitle: 'Conteúdo Draft de Teste',
      painCategory: 'Teste',
      targetNiche: 'Teste',
      relatedService: 'Teste',
      funnelStage: FunnelStage.AWARENESS,
      idealFormat: 'post',
      recommendedChannel: Channel.LINKEDIN,
      ctaDestination: CTADestination.WHATSAPP,
      status: ContentStatus.DRAFT,
    },
  })

  // APPROVED ContentPiece
  await prisma.contentPiece.upsert({
    where: { id: TEST_IDS.APPROVED_PIECE },
    update: {},
    create: {
      id: TEST_IDS.APPROVED_PIECE,
      themeId: TEST_IDS.THEME_2,
      baseTitle: 'Conteúdo Aprovado de Teste',
      painCategory: 'Teste',
      targetNiche: 'Teste',
      relatedService: 'Teste',
      funnelStage: FunnelStage.CONSIDERATION,
      idealFormat: 'post',
      recommendedChannel: Channel.LINKEDIN,
      ctaDestination: CTADestination.WHATSAPP,
      status: ContentStatus.APPROVED,
      selectedAngle: ContentAngle.CONSULTIVE,
    },
  })

  // Angle variants for DRAFT_PIECE
  const draftVariants = [
    {
      id: TEST_IDS.DRAFT_AGGRESSIVE,
      angle: ContentAngle.AGGRESSIVE,
      text: 'Texto agressivo de teste para o tema draft.',
      isSelected: false,
    },
    {
      id: TEST_IDS.DRAFT_CONSULTIVE,
      angle: ContentAngle.CONSULTIVE,
      text: 'Texto consultivo de teste para o tema draft com mais detalhes.',
      isSelected: false,
    },
    {
      id: TEST_IDS.DRAFT_AUTHORIAL,
      angle: ContentAngle.AUTHORIAL,
      text: 'Texto autoral de teste com case de sucesso fictício para o tema draft.',
      isSelected: false,
    },
  ]

  for (const v of draftVariants) {
    await prisma.contentAngleVariant.upsert({
      where: { id: v.id },
      update: {},
      create: {
        id: v.id,
        pieceId: TEST_IDS.DRAFT_PIECE,
        angle: v.angle,
        text: v.text,
        charCount: v.text.length,
        hashtags: ['#teste', '#inboundforge'],
        ctaText: 'Fale conosco no WhatsApp',
        recommendedCTA: 'Fale conosco no WhatsApp',
        suggestedChannel: Channel.LINKEDIN,
        isSelected: v.isSelected,
        generationVersion: 1,
      },
    })
  }

  // Angle variants for APPROVED_PIECE
  const approvedVariants = [
    {
      id: TEST_IDS.APPROVED_AGGRESSIVE,
      angle: ContentAngle.AGGRESSIVE,
      text: 'Texto agressivo aprovado de teste.',
      isSelected: false,
    },
    {
      id: TEST_IDS.APPROVED_CONSULTIVE,
      angle: ContentAngle.CONSULTIVE,
      text: 'Texto consultivo aprovado de teste com detalhes extras.',
      isSelected: true,
    },
    {
      id: TEST_IDS.APPROVED_AUTHORIAL,
      angle: ContentAngle.AUTHORIAL,
      text: 'Texto autoral aprovado de teste com case real.',
      isSelected: false,
    },
  ]

  for (const v of approvedVariants) {
    await prisma.contentAngleVariant.upsert({
      where: { id: v.id },
      update: {},
      create: {
        id: v.id,
        pieceId: TEST_IDS.APPROVED_PIECE,
        angle: v.angle,
        text: v.text,
        charCount: v.text.length,
        hashtags: ['#teste', '#aprovado'],
        ctaText: 'Agende uma conversa',
        recommendedCTA: 'Agende uma conversa',
        suggestedChannel: Channel.LINKEDIN,
        isSelected: v.isSelected,
        generationVersion: 1,
      },
    })
  }

  console.log('[seed:content:test] Fixtures determinísticas criadas com sucesso')
}
