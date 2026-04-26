'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import type { PublishingPost } from '@/types/publishing'

interface PostRescheduleModalProps {
  post: PublishingPost | null
  open: boolean
  onClose: () => void
  onReschedule: (postId: string, newDate: Date) => void
}

export function PostRescheduleModal({
  post,
  open,
  onClose,
  onReschedule,
}: PostRescheduleModalProps) {
  const [dateValue, setDateValue] = useState('')
  const [timeValue, setTimeValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const firstInputRef = useRef<HTMLInputElement>(null)

  // Populate from post
  useEffect(() => {
    if (post?.scheduledAt) {
      const d = new Date(post.scheduledAt)
      setDateValue(format(d, 'yyyy-MM-dd'))
      setTimeValue(format(d, 'HH:mm'))
    } else {
      setDateValue('')
      setTimeValue('')
    }
    setError(null)
  }, [post])

  // Focus trap: foca primeiro input ao abrir e cicla Tab/Shift+Tab dentro do modal
  useEffect(() => {
    if (!open) return
    firstInputRef.current?.focus()
  }, [open])

  const handleTrapKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key !== 'Tab') return

      const dialog = dialogRef.current
      if (!dialog) return

      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      )
      if (focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    },
    [onClose],
  )


  function handleConfirm() {
    if (!post) return

    if (!dateValue || !timeValue) {
      setError('Preencha data e hora')
      return
    }

    const newDate = new Date(`${dateValue}T${timeValue}:00`)

    if (isNaN(newDate.getTime())) {
      setError('Data ou hora invalida')
      return
    }

    if (newDate < new Date()) {
      setError('A data não pode ser no passado')
      return
    }

    setError(null)
    try {
      onReschedule(post.id, newDate)
      toast.success('Post reagendado com sucesso')
    } catch {
      toast.error('Erro ao reagendar post. Tente novamente.')
    }
  }

  if (!open || !post) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reschedule-title"
        onKeyDown={handleTrapKeyDown}
        className="mx-4 w-full max-w-md rounded-lg bg-card p-6 shadow-xl"
      >
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 id="reschedule-title" className="text-lg font-semibold text-foreground">Reagendar Post</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Post info */}
        <p className="mb-4 truncate text-sm text-muted-foreground">{post.caption}</p>

        {/* Date input */}
        <div className="mb-3">
          <label htmlFor="reschedule-date" className="mb-1 block text-sm font-medium text-foreground">
            Data
          </label>
          <input
            ref={firstInputRef}
            id="reschedule-date"
            type="date"
            value={dateValue}
            onChange={(e) => setDateValue(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-base focus-visible:border-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
          />
        </div>

        {/* Time input */}
        <div className="mb-4">
          <label htmlFor="reschedule-time" className="mb-1 block text-sm font-medium text-foreground">
            Hora
          </label>
          <input
            id="reschedule-time"
            type="time"
            value={timeValue}
            onChange={(e) => setTimeValue(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-base focus-visible:border-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
          />
        </div>

        {/* Error */}
        {error && (
          <p className="mb-3 text-sm text-danger" role="alert">
            {error}
          </p>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-input px-4 py-2 text-sm font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  )
}
