'use client'

// Rota propria do studio de arte: /content/[themeId]/art
// Rastreabilidade: TASK-024 (P3 - studio de arte vira rota propria).
// Permite share/deep-link direto do studio. Reaproveita o ContentEditorProvider para
// carregar o mesmo piece/angles do tema e renderiza o ArtStudioPanel extraido.

import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { ContentEditorProvider } from '@/contexts/ContentEditorContext'
import { ArtStudioPanel } from '@/components/content/ArtStudioPanel'

export default function ContentArtStudioPage() {
  const { themeId, locale } = useParams<{ themeId: string; locale: string }>()
  const searchParams = useSearchParams()
  const initialAngleId = searchParams.get('angleId') ?? undefined
  const initialChannel = searchParams.get('channel') ?? undefined

  return (
    <ContentEditorProvider themeId={themeId} initialAngleId={initialAngleId} initialChannel={initialChannel}>
      <section className="space-y-6" data-testid="content-art-studio-page">
        <header className="space-y-2">
          <Link
            href={`/${locale}/content/${themeId}`}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            data-testid="art-studio-back-link"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar ao conteudo
          </Link>
          <div>
            <h1 className="text-2xl font-semibold">Studio de arte</h1>
            <p className="text-sm text-muted-foreground">
              Gere e ajuste a arte visual do conteudo. Esta URL pode ser compartilhada.
            </p>
          </div>
        </header>

        <ArtStudioPanel />
      </section>
    </ContentEditorProvider>
  )
}
