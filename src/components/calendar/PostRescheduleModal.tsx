'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { X } from 'lucide-react'
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

  // Focus trap - focus first input when opened
  useEffect(() => {
    if (open) {
      firstInputRef.current?.focus()
    }
  }, [open])

  // Esc to close
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
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
      setError('A data nao pode ser no passado')
      return
    }

    setError(null)
    onReschedule(post.id, newDate)
  }

  if (!open || !post) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-label="Reagendar post"
    >
      <div
        ref={dialogRef}
        className="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
      >
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Reagendar Post</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Post info */}
        <p className="mb-4 truncate text-sm text-gray-600">{post.caption}</p>

        {/* Date input */}
        <div className="mb-3">
          <label htmlFor="reschedule-date" className="mb-1 block text-sm font-medium text-gray-700">
            Data
          </label>
          <input
            ref={firstInputRef}
            id="reschedule-date"
            type="date"
            value={dateValue}
            onChange={(e) => setDateValue(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Time input */}
        <div className="mb-4">
          <label htmlFor="reschedule-time" className="mb-1 block text-sm font-medium text-gray-700">
            Hora
          </label>
          <input
            id="reschedule-time"
            type="time"
            value={timeValue}
            onChange={(e) => setTimeValue(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Error */}
        {error && (
          <p className="mb-3 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  )
}
