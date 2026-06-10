'use client'

// ArtStudioPanel — Studio de arte extraido para uso em rota propria (/content/[themeId]/art).
// Rastreabilidade: TASK-024 (P3 - studio de arte vira rota propria).
// Consome o ContentEditorContext (mesmo piece/angles da pagina de conteudo) e mantem o
// estado local de template/headline/background/dimensao. Trata loading, empty e error para
// permitir deep-link direto na rota sem depender de navegacao previa.

import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { useContentEditorContext } from '@/contexts/ContentEditorContext'
import { ArtPreview } from '@/components/content/ArtPreview'
import { ArtControls } from '@/components/content/ArtControls'
import { ImagePreviewPanel } from '@/components/content/ImagePreviewPanel'
import type { ImageTemplate, TemplateChannel } from '@/types/image-template'

export function ArtStudioPanel() {
  const editor = useContentEditorContext()
  const [selectedTemplate, setSelectedTemplate] = useState<ImageTemplate | null>(null)
  const [artHeadline, setArtHeadline] = useState('')
  const [artBackgroundUrl, setArtBackgroundUrl] = useState<string | undefined>()
  const [artDimension, setArtDimension] = useState<'og' | 'instagram'>('og')
  const [isRegeneratingBg, setIsRegeneratingBg] = useState(false)

  // CL-082: auto-atualizar headline do preview ao selecionar angulo.
  useEffect(() => {
    if (editor.piece && editor.selectedAngleId) {
      const angle = editor.piece.angles.find((a) => a.id === editor.selectedAngleId)
      if (angle) {
        const headlineText = (angle.editedBody ?? angle.text).split('\n')[0]?.slice(0, 80) ?? ''
        setArtHeadline(headlineText)
      }
    }
  }, [editor.piece, editor.selectedAngleId])

  const hasAngles = (editor.piece?.angles.length ?? 0) > 0

  // Loading: piece ainda sendo carregada.
  if (editor.isLoading) {
    return (
      <div
        className="flex items-center justify-center gap-2 rounded-md border border-border bg-surface p-8 text-sm text-muted-foreground"
        data-testid="art-studio-loading"
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando studio de arte...
      </div>
    )
  }

  // Error: degradacao do editor.
  if (editor.error) {
    return (
      <div
        className="rounded-md border border-yellow-200 bg-yellow-50 p-4"
        data-testid="art-studio-error"
      >
        <p className="text-sm text-yellow-800">{editor.error}</p>
        <button
          onClick={() => editor.refetch()}
          className="mt-2 text-xs font-medium text-yellow-700 underline hover:text-yellow-900"
        >
          Tentar novamente
        </button>
      </div>
    )
  }

  // Empty: nenhum angulo gerado ainda — orienta o usuario a gerar conteudo primeiro.
  if (!hasAngles || !editor.piece?.id) {
    return (
      <div
        className="rounded-md border border-dashed border-border bg-surface p-8 text-center"
        data-testid="art-studio-empty"
      >
        <p className="text-sm text-muted-foreground">
          Nenhum conteudo gerado para este tema ainda.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Gere os angulos na pagina de conteudo antes de criar a arte.
        </p>
      </div>
    )
  }

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_280px]" data-testid="image-generation-area">
      {/* Preview em tempo real */}
      <div className="space-y-3">
        <ArtPreview
          template={selectedTemplate?.templateType}
          headline={artHeadline}
          backgroundUrl={artBackgroundUrl}
          dimensions={artDimension === 'og' ? { width: 1200, height: 630 } : { width: 1080, height: 1350 }}
        />
        {/* Fallback: job-based generation */}
        <ImagePreviewPanel contentPieceId={editor.piece.id} />
      </div>

      {/* Controles de arte */}
      <ArtControls
        headline={artHeadline}
        selectedTemplateId={selectedTemplate?.id}
        channel={
          editor.selectedChannel === 'LINKEDIN' ? 'linkedin'
          : editor.selectedChannel === 'INSTAGRAM' ? 'instagram'
          : 'blog' as TemplateChannel
        }
        dimensions={artDimension}
        isRegenerating={isRegeneratingBg}
        onTemplateChange={setSelectedTemplate}
        onHeadlineChange={setArtHeadline}
        onDimensionChange={setArtDimension}
        onRegenerateBackground={async (dims) => {
          setIsRegeneratingBg(true)
          try {
            const res = await fetch('/api/v1/images/preview', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                template: selectedTemplate?.templateType,
                headline: artHeadline,
                ...dims,
              }),
            })
            if (res.ok) {
              const json = await res.json()
              if (json.imageUrl) setArtBackgroundUrl(json.imageUrl)
            }
          } catch {
            // silent — preview continua com background anterior
          } finally {
            setIsRegeneratingBg(false)
          }
        }}
        disabled={editor.isGenerating}
      />
    </div>
  )
}
