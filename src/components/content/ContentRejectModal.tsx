'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/modal'

interface ContentRejectModalProps {
  open: boolean
  onClose: () => void
  onConfirm: (reason: string) => Promise<boolean>
}

export function ContentRejectModal({ open, onClose, onConfirm }: ContentRejectModalProps) {
  const [reason, setReason] = useState('')
  const isValid = reason.trim().length >= 10

  async function handleConfirm() {
    if (!isValid) return
    const ok = await onConfirm(reason.trim())
    if (ok) {
      setReason('')
      onClose()
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        setReason('')
        onClose()
      }}
      title="Rejeitar conteúdo"
      description="Informe o motivo da rejeição para que a próxima geração leve em conta seu feedback."
      onConfirm={handleConfirm}
      confirmLabel="Rejeitar"
      isDestructive
    >
      <div className="space-y-2">
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Descreva o motivo da rejeição (mínimo 10 caracteres)..."
          className="w-full min-h-[120px] resize-none rounded-md border border-input bg-background p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Motivo da rejeição"
          autoFocus
          data-testid="reject-reason-textarea"
        />
        <div className="flex items-center justify-between">
          <span
            className={`text-xs ${isValid ? 'text-muted-foreground' : 'text-[#991B1B]'}`}
            data-testid="reject-char-count"
          >
            {reason.trim().length} / 10 caracteres mínimos
          </span>
          {!isValid && reason.length > 0 && (
            <span className="text-xs text-[#991B1B]">Mínimo de 10 caracteres</span>
          )}
        </div>
      </div>
    </Modal>
  )
}
