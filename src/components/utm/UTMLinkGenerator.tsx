'use client'

import { useState } from 'react'
import { Copy, Link2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/components/ui/toast'
import { UTM_MEDIUMS } from '@/constants/utm-constants'

type GeneratorState = 'idle' | 'generating' | 'generated' | 'error'
type MediumValue = (typeof UTM_MEDIUMS)[keyof typeof UTM_MEDIUMS]

interface UTMLinkGeneratorProps {
  postId: string
  themeSlug: string
  onGenerated?: (link: { id: string; fullUrl: string; medium: string }) => void
}

const MEDIUM_OPTIONS = [
  { value: UTM_MEDIUMS.WHATSAPP, label: 'WhatsApp' },
  { value: UTM_MEDIUMS.BLOG, label: 'Blog' },
  { value: UTM_MEDIUMS.LINKEDIN, label: 'LinkedIn' },
  { value: UTM_MEDIUMS.INSTAGRAM, label: 'Instagram' },
]

export function UTMLinkGenerator({ postId, themeSlug, onGenerated }: UTMLinkGeneratorProps) {
  const [state, setState] = useState<GeneratorState>('idle')
  const [medium, setMedium] = useState<MediumValue>(UTM_MEDIUMS.WHATSAPP)
  const [generatedUrl, setGeneratedUrl] = useState('')

  async function handleGenerate() {
    setState('generating')

    try {
      const res = await fetch('/api/v1/utm-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId,
          source: 'inbound-forge',
          medium,
          campaign: themeSlug,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error ?? 'Erro ao gerar UTM link')
      }

      const result = await res.json()
      const link = result.data ?? result
      setGeneratedUrl(link.fullUrl)
      setState('generated')
      onGenerated?.({ id: link.id, fullUrl: link.fullUrl, medium })
    } catch (err) {
      setState('error')
      toast.error(err instanceof Error ? err.message : 'Erro ao gerar UTM link')
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(generatedUrl)
      toast.success('UTM link gerado e copiado!')
    } catch {
      toast.error('Erro ao copiar link')
    }
  }

  return (
    <div data-testid="utm-link-generator" className="space-y-4">
      <Select
        label="Canal"
        options={MEDIUM_OPTIONS}
        value={medium}
        onChange={(e) => setMedium(e.target.value as MediumValue)}
        aria-label="Selecionar canal UTM"
        data-testid="utm-channel-select"
      />

      {state === 'generating' && (
        <div role="status" aria-label="Gerando UTM link..." data-testid="utm-skeleton-loader">
          <Skeleton variant="rectangle" className="h-11 w-full" />
          <span className="sr-only">Gerando UTM link...</span>
        </div>
      )}

      {state === 'generated' && (
        <div className="flex items-center gap-2" data-testid="utm-generated-url">
          <Input
            value={generatedUrl}
            readOnly
            aria-label="URL UTM gerada"
            data-testid="utm-url-input"
          />
          <Button
            variant="outline"
            size="icon"
            onClick={handleCopy}
            aria-label="Copiar link UTM"
            data-testid="utm-copy-button"
          >
            <Copy className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      )}

      {state !== 'generating' && state !== 'generated' && (
        <Button
          onClick={handleGenerate}
          data-testid="utm-generate-button"
          aria-label="Gerar link UTM"
        >
          <Link2 className="h-4 w-4" aria-hidden />
          Gerar UTM
        </Button>
      )}

      {state === 'error' && (
        <Button
          variant="outline"
          onClick={handleGenerate}
          data-testid="utm-retry-button"
          aria-label="Tentar gerar UTM novamente"
        >
          <Link2 className="h-4 w-4" aria-hidden />
          Tentar novamente
        </Button>
      )}
    </div>
  )
}
