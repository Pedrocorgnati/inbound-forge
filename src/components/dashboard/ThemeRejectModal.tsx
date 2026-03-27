'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/modal'

interface ThemeRejectModalProps {
  open: boolean
  onClose: () => void
  themeTitle: string
  onConfirm: (reason: string) => Promise<boolean>
}

export function ThemeRejectModal({ open, onClose, themeTitle, onConfirm }: ThemeRejectModalProps) {
  const [reason, setReason] = useState('')
  const isValid = reason.trim().length >= 10

  function handleClose() {
    setReason('')
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Rejeitar Tema"
      description={`Rejeitando: ${themeTitle}`}
      confirmLabel="Confirmar Rejeição"
      isDestructive
      onConfirm={isValid ? () => onConfirm(reason.trim()).then((ok) => {
        if (ok) { setReason(''); } else { throw new Error('fail') }
      }) : undefined}
    >
      <div className="space-y-2">
        <label htmlFor="reject-reason" className="text-sm font-medium text-foreground">
          Por que está rejeitando este tema?
        </label>
        <textarea
          id="reject-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Descreva o motivo da rejeição..."
          rows={3}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <p className={`text-xs ${reason.trim().length < 10 ? 'text-destructive' : 'text-muted-foreground'}`}>
          {reason.trim().length}/10 caracteres mínimos
        </p>
      </div>
    </Modal>
  )
}
