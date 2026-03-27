'use client'

import { useState, useEffect, useCallback } from 'react'
import { Check, X, AlertTriangle, Linkedin, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Modal } from '@/components/ui/modal'
import { CopyButton } from '@/components/publishing/CopyButton'
import { LinkedInPostPreview } from '@/components/publishing/LinkedInPostPreview'
import { PUBLISHING_CHANNELS } from '@/lib/constants/publishing'

interface LinkedInExportPanelProps {
  postId: string
}

interface LinkedInData {
  hook: string
  body: string
  ctaBlock: string
  hashtagsLine: string
  fullText: string
  imageUrl: string | null
  charCount: number
  warnings: string[]
}

const MAX_CHARS = PUBLISHING_CHANNELS.LINKEDIN.maxCaptionLength
const MAX_HASHTAGS = PUBLISHING_CHANNELS.LINKEDIN.maxHashtags

export function LinkedInExportPanel({ postId }: LinkedInExportPanelProps) {
  const [data, setData] = useState<LinkedInData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [editedText, setEditedText] = useState('')
  const [published, setPublished] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/posts/${postId}/linkedin-format`)
        if (!res.ok) throw new Error('Erro ao carregar dados')
        const json = await res.json()
        const payload: LinkedInData = json.data ?? json
        setData(payload)
        setEditedText(payload.fullText)
      } catch {
        toast.error('Erro ao carregar formato LinkedIn')
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [postId])

  const currentCharCount = editedText.length
  const hashtags = data?.hashtagsLine ? data.hashtagsLine.split(' ').filter(Boolean) : []
  const hashtagCount = hashtags.length

  const handleMarkPublished = useCallback(async () => {
    try {
      const res = await fetch(`/api/posts/${postId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'PUBLISHED',
          publishedAt: new Date().toISOString(),
        }),
      })
      if (!res.ok) throw new Error('Erro ao atualizar status')
      setPublished(true)
      toast.success('Post marcado como publicado no LinkedIn')
    } catch {
      toast.error('Erro ao marcar como publicado')
      throw new Error('Erro ao marcar como publicado')
    }
  }, [postId])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Carregando...</span>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        Nao foi possivel carregar os dados do post.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Preview */}
      <LinkedInPostPreview
        formattedText={editedText}
        hashtags={hashtags}
        imageUrl={data.imageUrl ?? undefined}
        charCount={currentCharCount}
      />

      {/* Editable text area */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Linkedin className="h-5 w-5" />
            Texto para LinkedIn
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <textarea
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            rows={10}
            className="w-full rounded-md border border-border bg-background p-3 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="Texto editavel para LinkedIn"
          />

          {/* Char counter */}
          <div className="flex items-center justify-between">
            <span
              className={cn(
                'text-xs',
                currentCharCount > MAX_CHARS ? 'text-red-600 font-medium' : 'text-muted-foreground'
              )}
            >
              {currentCharCount}/{MAX_CHARS} caracteres
              {currentCharCount > MAX_CHARS && ' — excede o limite'}
            </span>
            <CopyButton text={editedText} label="Copiar texto" />
          </div>
        </CardContent>
      </Card>

      {/* Checklist */}
      <Card>
        <CardHeader>
          <CardTitle>Checklist de publicacao</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            <CheckItem
              ok={currentCharCount <= MAX_CHARS}
              label={`Texto dentro de ${MAX_CHARS} chars`}
            />
            <CheckItem
              ok={hashtagCount <= MAX_HASHTAGS}
              warn={hashtagCount > MAX_HASHTAGS}
              label={`Max ${MAX_HASHTAGS} hashtags (${hashtagCount} usadas)`}
            />
            <CheckItem
              ok={!!data.ctaBlock}
              label="CTA incluido"
            />
            <li className="flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 shrink-0 text-yellow-500" />
              <span className="text-yellow-700">Imagem: baixar manualmente</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Publish button */}
      <div className="flex justify-end">
        <Button
          onClick={() => setConfirmOpen(true)}
          disabled={published}
          variant={published ? 'outline' : 'default'}
        >
          {published ? (
            <>
              <Check className="h-4 w-4" />
              Publicado
            </>
          ) : (
            <>
              <Linkedin className="h-4 w-4" />
              Marcar como Publicado
            </>
          )}
        </Button>
      </div>

      {/* Confirmation modal */}
      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Confirmar publicacao"
        description="Deseja marcar este post como publicado no LinkedIn?"
        confirmLabel="Confirmar"
        cancelLabel="Cancelar"
        onConfirm={handleMarkPublished}
      />
    </div>
  )
}

function CheckItem({
  ok,
  warn,
  label,
}: {
  ok: boolean
  warn?: boolean
  label: string
}) {
  if (warn) {
    return (
      <li className="flex items-center gap-2 text-sm">
        <AlertTriangle className="h-4 w-4 shrink-0 text-yellow-500" />
        <span className="text-yellow-700">{label}</span>
      </li>
    )
  }

  return (
    <li className="flex items-center gap-2 text-sm">
      {ok ? (
        <Check className="h-4 w-4 shrink-0 text-green-600" />
      ) : (
        <X className="h-4 w-4 shrink-0 text-red-500" />
      )}
      <span className={ok ? 'text-green-700' : 'text-red-600'}>{label}</span>
    </li>
  )
}
