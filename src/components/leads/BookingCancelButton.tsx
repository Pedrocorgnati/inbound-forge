'use client'

// Intake Review TASK-10 ST002 (CL-258) — botao client-side que cancela
// uma reuniao Cal.com atraves do endpoint v1.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { apiClient } from '@/lib/api-client'

interface BookingCancelButtonProps {
  leadId: string
  bookingId: string
  disabled?: boolean
}

export function BookingCancelButton({ leadId, bookingId, disabled }: BookingCancelButtonProps) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const confirm = async () => {
    setError(null)
    try {
      const res = await apiClient(
        `/api/v1/leads/${leadId}/bookings/${bookingId}/cancel`,
        { method: 'POST' },
      )
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { message?: string } | null
        throw new Error(body?.message ?? 'falha')
      }
      setOpen(false)
      startTransition(() => router.refresh())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao cancelar')
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        disabled={disabled || isPending}
        data-testid="booking-cancel-button"
      >
        Cancelar
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={(o) => !o && setOpen(false)}
        onConfirm={confirm}
        title="Cancelar reunião"
        description={
          error
            ? `Erro: ${error}. Tentar novamente?`
            : 'A reunião Cal.com será cancelada e o status atualizado no lead. Esta ação não pode ser desfeita.'
        }
        confirmLabel="Cancelar reunião"
        variant="destructive"
      />
    </>
  )
}
