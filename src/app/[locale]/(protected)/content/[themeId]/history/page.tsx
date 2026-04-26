// TASK-12 (CL-254, CL-255): pagina de historico de versoes com diff.

import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { VersionTimeline } from '@/components/content/VersionTimeline'

interface PageProps {
  params: Promise<{ themeId: string; locale: string }>
}

export default async function ContentHistoryPage({ params }: PageProps) {
  const { themeId } = await params

  // Pega a ContentPiece ativa do tema (mais recente)
  const piece = await prisma.contentPiece.findFirst({
    where: { themeId },
    orderBy: { updatedAt: 'desc' },
  })
  if (!piece) notFound()

  return (
    <section className="space-y-5" data-testid="content-history-page">
      <header>
        <h1 className="text-2xl font-semibold">Histórico de versões</h1>
        <p className="text-sm text-muted-foreground">{piece.baseTitle}</p>
      </header>
      <VersionTimeline pieceId={piece.id} />
    </section>
  )
}
