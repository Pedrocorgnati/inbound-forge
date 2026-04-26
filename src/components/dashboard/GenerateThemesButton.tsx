'use client'

/**
 * Intake Review TASK-10 ST002 (CL-052) — Botao de geracao sincrona de sugestoes de temas.
 */
import { useState } from 'react'
import { toast } from 'sonner'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  onGenerated?: () => void
  disabled?: boolean
}

export function GenerateThemesButton({ onGenerated, disabled }: Props) {
  const [busy, setBusy] = useState(false)

  async function handleClick() {
    setBusy(true)
    try {
      const res = await fetch('/api/v1/themes/suggestions', {
        method: 'POST',
        credentials: 'include',
      })
      if (res.status === 429) {
        toast.error('Aguarde 5 minutos antes de gerar novamente.')
        return
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const payload = await res.json()
      const created = payload?.data?.createdCount ?? 0
      toast.success(`${created} novos temas sugeridos.`)
      onGenerated?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao gerar temas.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Button
      onClick={handleClick}
      disabled={busy || disabled}
      size="sm"
      className="gap-1.5"
      data-testid="generate-themes-button"
    >
      <Sparkles className={`h-4 w-4 ${busy ? 'animate-pulse' : ''}`} aria-hidden />
      {busy ? 'Gerando...' : 'Gerar temas agora'}
    </Button>
  )
}
