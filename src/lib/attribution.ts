/**
 * Atribuição first-touch e assisted-touch — INT-073
 * SEC-008: NUNCA logar lead.contactInfo em nenhum trecho
 */
import { prisma } from '@/lib/prisma'
import { ATTRIBUTION_CONFIDENCE } from '@/constants/attribution-constants'
import type { AttributionResult } from '@/types/leads'

/**
 * Calcula atribuição first-touch para um lead.
 * - Se Lead.firstTouchPostId e há UTMLink para esse postId → confidence=1.0
 * - Se Lead.channel mas sem UTMLink → confidence=0.6
 * - Sem dados → confidence=0.0
 */
export async function calculateFirstTouchAttribution(leadId: string): Promise<AttributionResult | null> {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: {
      id: true,
      firstTouchPostId: true,
      channel: true,
      // NUNCA selecionar contactInfo — SEC-008
    },
  })

  if (!lead) return null

  // Caso 1: há UTMLink para o post de first-touch
  if (lead.firstTouchPostId) {
    const utmLink = await prisma.uTMLink.findUnique({
      where: { postId: lead.firstTouchPostId },
    })

    if (utmLink) {
      return {
        type: 'FIRST_TOUCH',
        postId: lead.firstTouchPostId,
        source: utmLink.source,
        campaign: utmLink.campaign,
        medium: utmLink.medium,
        confidence: ATTRIBUTION_CONFIDENCE.WITH_UTM,
        inferred: false,
      }
    }
  }

  // Caso 2: tem channel mas sem UTMLink
  if (lead.channel) {
    return {
      type: 'FIRST_TOUCH',
      postId: lead.firstTouchPostId,
      source: lead.channel.toLowerCase(),
      confidence: ATTRIBUTION_CONFIDENCE.CHANNEL_ONLY,
      inferred: false,
    }
  }

  // Caso 3: sem dados suficientes
  return {
    type: 'FIRST_TOUCH',
    postId: lead.firstTouchPostId,
    confidence: ATTRIBUTION_CONFIDENCE.NO_DATA,
    inferred: false,
  }
}

/**
 * Calcula atribuição assisted-touch para um lead em relação a uma conversão.
 * Retorna posts do mesmo tema com UTMLink publicados antes da conversão.
 */
export async function calculateAssistedTouchAttribution(
  leadId: string,
  conversionId: string
): Promise<AttributionResult[]> {
  const conversion = await prisma.conversionEvent.findUnique({
    where: { id: conversionId },
    include: { lead: { select: { firstTouchThemeId: true } } },
  })

  if (!conversion) return []

  // Buscar posts do mesmo tema com UTMLink publicados ANTES da conversão
  const postsWithUTM = await prisma.post.findMany({
    where: {
      contentPiece: { themeId: conversion.lead.firstTouchThemeId },
      createdAt: { lt: conversion.occurredAt },
      utmLink: { isNot: null },
    },
    include: { utmLink: true },
    orderBy: { createdAt: 'desc' },
    take: 10,
  })

  return postsWithUTM
    .filter((p) => p.utmLink !== null)
    .map((p) => ({
      type: 'ASSISTED_TOUCH' as const,
      postId: p.id,
      source: p.utmLink!.source,
      campaign: p.utmLink!.campaign,
      medium: p.utmLink!.medium,
      confidence: ATTRIBUTION_CONFIDENCE.ASSISTED,
      inferred: false,
    }))
}
