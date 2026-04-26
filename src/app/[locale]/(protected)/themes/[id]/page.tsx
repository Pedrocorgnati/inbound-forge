// Intake-Review TASK-3 ST002 (CL-196): detalhe de tema.
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { ThemeDetailPanel } from '@/components/dashboard/ThemeDetailPanel'

export const dynamic = 'force-dynamic'

interface PageParams {
  params: Promise<{ locale: string; id: string }>
}

export default async function ThemeDetailPage({ params }: PageParams) {
  const { locale, id } = await params

  const theme = await prisma.theme.findUnique({
    where: { id },
    include: {
      pain: { select: { id: true, title: true, description: true } },
      case: { select: { id: true, name: true, outcome: true } },
      solutionPattern: { select: { id: true, name: true, description: true } },
      nicheOpportunity: { select: { id: true, isGeoReady: true } },
      contentPieces: {
        select: { id: true, status: true, recommendedChannel: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
    },
  })

  if (!theme) notFound()

  // Heuristica fontes (ver /api/v1/themes/:id/sources — mesma regra)
  const windowStart = new Date(theme.createdAt.getTime() - 7 * 24 * 60 * 60 * 1000)
  const sourcesWhere: Record<string, unknown> = {
    isPainCandidate: true,
    createdAt: { gte: windowStart, lte: theme.createdAt },
  }
  if (theme.painId) {
    sourcesWhere.OR = [
      { classificationResult: { path: ['painId'], equals: theme.painId } },
      { classificationResult: { path: ['pain_id'], equals: theme.painId } },
    ]
  }
  const sourceRows = await prisma.scrapedText.findMany({
    where: sourcesWhere,
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: { id: true, url: true, title: true, createdAt: true, classificationResult: true },
  })
  const sources = sourceRows.map((r) => ({
    id: r.id,
    url: r.url,
    title: r.title,
    createdAt: r.createdAt,
    scoreContribution: (r.classificationResult as { score?: number } | null)?.score ?? null,
  }))

  return (
    <div className="mx-auto max-w-5xl p-4">
      <ThemeDetailPanel
        theme={{
          id: theme.id,
          title: theme.title,
          status: theme.status,
          conversionScore: theme.conversionScore,
          rejectionReason: theme.rejectionReason,
          rejectedAt: theme.rejectedAt,
          createdAt: theme.createdAt,
          updatedAt: theme.updatedAt,
          scoreBreakdown: theme.scoreBreakdown,
          pain: theme.pain,
          case: theme.case,
          solutionPattern: theme.solutionPattern,
          nicheOpportunity: theme.nicheOpportunity,
          contentPieces: theme.contentPieces,
        }}
        sources={sources}
        locale={locale}
      />
    </div>
  )
}
