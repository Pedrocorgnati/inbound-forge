'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface CopyContextButtonProps {
  themeId: string
  disabled?: boolean
}

export function CopyContextButton({ themeId, disabled }: CopyContextButtonProps) {
  const tToast = useTranslations('toasts')
  const [copied, setCopied] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  async function handleCopy() {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/v1/themes/${themeId}`)
      if (!res.ok) {
        toast.error(tToast('content.load_failed'))
        return
      }

      const { data: theme } = await res.json()

      const lines: string[] = [
        `TEMA: ${theme.title}`,
        '',
      ]

      // Dores
      if (theme.pain) {
        lines.push('DORES:')
        lines.push(`- ${theme.pain.title}: ${theme.pain.description ?? ''}`)
        lines.push('')
      }

      // Cases
      if (theme.case) {
        lines.push('CASES:')
        lines.push(`- ${theme.case.name}: ${theme.case.outcome ?? ''}`)
        lines.push('')
      }

      // Padrão de solução
      if (theme.solutionPattern) {
        lines.push('PADRÃO DE SOLUÇÃO:')
        lines.push(`- ${theme.solutionPattern.name}: ${theme.solutionPattern.description ?? ''}`)
        lines.push('')
      }

      lines.push(
        'GERE 3 ÂNGULOS (AGGRESSIVE / CONSULTIVE / AUTHORIAL) no formato JSON:',
        '[{ "angle": "AGGRESSIVE", "body": "...", "ctaText": "...", "hashtags": [...] }, ...]',
      )

      await navigator.clipboard.writeText(lines.join('\n'))
      setCopied(true)
      toast.success(tToast('content.context_copied'))
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error(tToast('content.copy_context_failed'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleCopy}
      disabled={disabled || isLoading}
      data-testid="copy-context-btn"
      title="Copiar contexto do tema para colar no Claude.ai"
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {copied ? 'Copiado!' : 'Copiar contexto'}
    </Button>
  )
}
