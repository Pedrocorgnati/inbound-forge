'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, Palette, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ContentEditorProvider, useContentEditorContext } from '@/contexts/ContentEditorContext'
import { ContentEditorHeader } from '@/components/content/ContentEditorHeader'
import { ContentEditorLayout } from '@/components/content/ContentEditorLayout'
import { AngleColumn } from '@/components/content/AngleColumn'
import { ApprovalPanel } from '@/components/content/ApprovalPanel'
import { CTAConfigurator } from '@/components/content/CTAConfigurator'
import { HashtagSuggestor } from '@/components/content/HashtagSuggestor'
import { FunnelStageSelector } from '@/components/content/FunnelStageSelector'
import { ChannelPreview } from '@/components/content/ChannelPreview'
import { AngleHistoryDrawer } from '@/components/content/AngleHistoryDrawer'

export default function ContentThemePage() {
  const { themeId, locale } = useParams<{ themeId: string; locale: string }>()

  return (
    <ContentEditorProvider themeId={themeId}>
      <ContentEditorInner themeId={themeId} locale={locale} />
    </ContentEditorProvider>
  )
}

function ContentEditorInner({ themeId, locale }: { themeId: string; locale: string }) {
  const editor = useContentEditorContext()
  const [showPreview, setShowPreview] = useState(false)
  const [historyAngleId, setHistoryAngleId] = useState<string | null>(null)
  const [localHashtags, setLocalHashtags] = useState<string[]>([])
  const [themeTitle, setThemeTitle] = useState('Conteúdo do Tema')

  // Fetch theme title
  useEffect(() => {
    async function loadTheme() {
      try {
        const res = await fetch(`/api/v1/themes?limit=50`)
        if (!res.ok) return
        const json = await res.json()
        const theme = json.data?.find((t: { id: string; title: string }) => t.id === themeId)
        if (theme) setThemeTitle(theme.title)
      } catch {
        // Fallback to default title
      }
    }
    loadTheme()
  }, [themeId])

  // Sync hashtags from selected angle (headline sync vive no studio de arte — TASK-024)
  useEffect(() => {
    if (editor.piece && editor.selectedAngleId) {
      const angle = editor.piece.angles.find((a) => a.id === editor.selectedAngleId)
      if (angle) {
        setLocalHashtags(angle.hashtags)
      }
    }
  }, [editor.piece, editor.selectedAngleId])

  const selectedAngle = editor.piece?.angles.find((a) => a.id === editor.selectedAngleId)
  const hasAngles = (editor.piece?.angles.length ?? 0) > 0

  const handleOpenHistory = useCallback((angleId: string) => {
    setHistoryAngleId(angleId)
  }, [])

  const handleCloseHistory = useCallback(() => {
    setHistoryAngleId(null)
  }, [])

  const handleHistoryRestored = useCallback(() => {
    editor.refetch()
  }, [editor])

  return (
    <div data-testid="content-theme-page" className="space-y-6">
      {/* Error banner — TASK-2 ST006: card informativo para degradação */}
      {editor.error && (
        <div
          className={`rounded-md border p-4 ${
            editor.error.includes('temporariamente indisponível') || editor.error.includes('indisponível')
              ? 'border-yellow-200 bg-yellow-50'
              : 'border-danger-bg bg-danger-bg/10'
          }`}
          data-testid="editor-error"
        >
          <p className={`text-sm ${
            editor.error.includes('temporariamente indisponível') || editor.error.includes('indisponível')
              ? 'text-yellow-800'
              : 'text-[#991B1B]'
          }`}>
            {editor.error}
          </p>
          {(editor.error.includes('temporariamente indisponível') || editor.error.includes('indisponível')) && (
            <button
              onClick={() => editor.generate(false)}
              disabled={editor.isGenerating}
              className="mt-2 text-xs font-medium text-yellow-700 underline hover:text-yellow-900 disabled:opacity-50"
            >
              Tentar novamente
            </button>
          )}
        </div>
      )}

      {/* Header */}
      <ContentEditorHeader
        themeId={themeId}
        themeTitle={themeTitle}
        status={editor.piece?.status ?? null}
        selectedChannel={editor.selectedChannel}
        isGenerating={editor.isGenerating}
        hasAngles={hasAngles}
        onChangeChannel={editor.changeChannel}
        onGenerate={(force) => editor.generate(force)}
      />

      {/* Three-column layout with angles */}
      <ContentEditorLayout
        isLoading={editor.isLoading}
        isGenerating={editor.isGenerating}
        hasAngles={hasAngles}
      >
        {editor.piece?.angles.map((angle) => (
          <AngleColumn
            key={angle.id}
            angle={angle}
            isSelected={angle.id === editor.selectedAngleId}
            selectedChannel={editor.selectedChannel}
            onSelect={editor.selectAngle}
            onSave={editor.updateAngle}
            onOpenHistory={handleOpenHistory}
            disabled={editor.isGenerating}
          />
        ))}
      </ContentEditorLayout>

      {/* Approval Panel */}
      {hasAngles && (
        <ApprovalPanel
          status={editor.piece?.status ?? null}
          selectedAngleId={editor.selectedAngleId}
          isGenerating={editor.isGenerating}
          onApprove={editor.approvePiece}
          onReject={(reason) => editor.rejectPiece(reason)}
        />
      )}

      {/* Configuration sidebar area */}
      {hasAngles && (
        <div className="grid gap-4 md:grid-cols-3" data-testid="editor-config-area">
          <Card className="p-4">
            <FunnelStageSelector
              value={editor.funnelStage}
              onChange={editor.changeFunnelStage}
              disabled={editor.isGenerating}
            />
          </Card>

          <Card className="p-4">
            <CTAConfigurator
              value={editor.ctaDestination}
              customText={editor.ctaCustomText}
              onChange={editor.changeCTADestination}
              onCustomTextChange={editor.changeCTACustomText}
              disabled={editor.isGenerating}
            />
          </Card>

          <Card className="p-4">
            <HashtagSuggestor
              hashtags={localHashtags}
              aiGenerated={localHashtags.length > 0}
              onChange={setLocalHashtags}
              disabled={editor.isGenerating}
            />
          </Card>
        </div>
      )}

      {/* Studio de arte agora vive em rota propria (/content/[themeId]/art) — TASK-024.
          O painel inline foi substituido por um acesso deep-linkavel ao studio. */}
      {hasAngles && editor.piece?.id && (
        <Card className="p-4" data-testid="art-studio-entry">
          <Link
            href={(() => {
              const params = new URLSearchParams()
              if (editor.selectedAngleId) params.set('angleId', editor.selectedAngleId)
              if (editor.selectedChannel) params.set('channel', editor.selectedChannel)
              const qs = params.toString()
              return `/${locale}/content/${themeId}/art${qs ? `?${qs}` : ''}`
            })()}
            className="flex items-center justify-between gap-4 rounded-md p-2 transition-colors hover:bg-muted"
            data-testid="art-studio-link"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Palette className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-medium">Studio de arte</p>
                <p className="text-xs text-muted-foreground">
                  Gere e ajuste a arte visual em uma pagina dedicada e compartilhavel.
                </p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Link>
        </Card>
      )}

      {/* Channel Preview Toggle */}
      {hasAngles && selectedAngle && (
        <div className="space-y-4" data-testid="preview-section">
          <Button
            variant="outline"
            onClick={() => setShowPreview(!showPreview)}
            data-testid="toggle-preview-btn"
          >
            {showPreview ? (
              <>
                <EyeOff className="h-4 w-4" />
                Ocultar preview
              </>
            ) : (
              <>
                <Eye className="h-4 w-4" />
                Ver preview
              </>
            )}
          </Button>

          {showPreview && (
            <ChannelPreview
              channel={editor.selectedChannel}
              body={selectedAngle.editedBody ?? selectedAngle.text}
              hashtags={localHashtags}
              ctaText={selectedAngle.ctaText}
            />
          )}
        </div>
      )}

      {/* Angle History Drawer */}
      <AngleHistoryDrawer
        open={historyAngleId !== null}
        onClose={handleCloseHistory}
        themeId={themeId}
        angleId={historyAngleId}
        onRestored={handleHistoryRestored}
      />
    </div>
  )
}
