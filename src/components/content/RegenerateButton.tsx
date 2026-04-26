'use client'

/**
 * TASK-6/ST002 (CL-190) — Botao de regenerar tema com quota e dialog.
 */
import { useState } from 'react'
import useSWR from 'swr'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { RegenerateConfirmDialog } from './RegenerateConfirmDialog'

interface Props {
  themeId: string
  onRegenerated?: () => void
}

interface QuotaPayload {
  data: { regenerationCount: number; cap: number }
}

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((r) => r.json())

export function RegenerateButton({ themeId, onRegenerated }: Props) {
  const t = useTranslations('regeneration')
  const [busy, setBusy] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)

  const { data, mutate } = useSWR<QuotaPayload>(
    `/api/v1/themes/${themeId}/regenerate`,
    fetcher
  )

  const count = data?.data?.regenerationCount ?? 0
  const cap = data?.data?.cap ?? 5
  const softThreshold = Number(process.env.NEXT_PUBLIC_REGEN_SOFT_THRESHOLD ?? 3)
  const atCap = count >= cap

  async function performRegenerate() {
    setBusy(true)
    try {
      const res = await fetch(`/api/v1/themes/${themeId}/regenerate`, {
        method: 'POST',
        credentials: 'include',
      })
      if (res.status === 429) {
        toast.error(t('blocked'))
        await mutate()
        return
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      toast.success(t('success'))
      await mutate()
      onRegenerated?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('error'))
    } finally {
      setBusy(false)
      setDialogOpen(false)
    }
  }

  function handleClick() {
    if (atCap) return
    if (count >= softThreshold) {
      setDialogOpen(true)
      return
    }
    void performRegenerate()
  }

  const btn = (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={busy || atCap}
      className="gap-1.5"
      data-testid="regenerate-theme-button"
    >
      <RefreshCw className={`h-3.5 w-3.5 ${busy ? 'animate-spin' : ''}`} aria-hidden />
      {t('button')}
      <span className="text-xs text-muted-foreground">
        {count}/{cap}
      </span>
    </Button>
  )

  return (
    <>
      {atCap ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <span>{btn}</span>
          </TooltipTrigger>
          <TooltipContent>{t('capReached', { cap })}</TooltipContent>
        </Tooltip>
      ) : (
        btn
      )}
      <RegenerateConfirmDialog
        open={dialogOpen}
        count={count}
        cap={cap}
        onClose={() => setDialogOpen(false)}
        onConfirm={performRegenerate}
      />
    </>
  )
}
