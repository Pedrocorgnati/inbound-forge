'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
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
import { ImagePreviewPanel } from '@/components/content/ImagePreviewPanel'
import { ArtPreview } from '@/components/content/ArtPreview'
import { ArtControls } from '@/components/content/ArtControls'
import type { ImageTemplate, TemplateChannel } from '@/types/image-template'

export default function ContentThemePage() {
  const { themeId } = useParams<{ themeId: string }>()

  return (
    <ContentEditorProvider themeId={themeId}>
      <ContentEditorInner themeId={themeId} />
    </ContentEditorProvider>
  )
}

function ContentEditorInner({ themeId }: { themeId: string }) {
  const editor = useContentEditorContext()
  const [showPreview, setShowPreview] = useState(false)
  const [historyAngleId, setHistoryAngleId] = useState<string | null>(null)
  const [localHashtags, setLocalHashtags] = useState<string[]>([])
  const [themeTitle, setThemeTitle] = useState('Conteúdo do Tema')
  const [selectedTemplate, setSelectedTemplate] = useState<ImageTemplate | null>(null)
  const [artHeadline, setArtHeadline] = useState('')
  const [artBackgroundUrl, setArtBackgroundUrl] = useState<string | undefined>()
  const [artDimension, setArtDimension] = useState<'og' | 'instagram'>('og')
  const [isRegeneratingBg, setIsRegeneratingBg] = useState(false)

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

  // Sync hashtags and headline from selected angle
  useEffect(() => {
    if (editor.piece && editor.selectedAngleId) {
      const angle = editor.piece.angles.find((a) => a.id === editor.selectedAngleId)
      if (angle) {
        setLocalHashtags(angle.hashtags)
        // CL-082: auto-atualizar headline do preview ao selecionar ângulo
        const headlineText = (angle.editedBody ?? angle.text).split('\n')[0]?.slice(0, 80) ?? ''
        setArtHeadline(headlineText)
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

      {/* Image Generation: ArtPreview + ArtControls (CL-082, CL-083) */}
      {hasAngles && editor.piece?.id && (
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
