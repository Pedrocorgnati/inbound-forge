'use client'

import { Modal } from '@/components/ui/modal'
import { Info } from 'lucide-react'

interface ThemeRestoreModalProps {
  open: boolean
  onClose: () => void
  themeTitle: string
  score: number
  onConfirm: () => Promise<boolean>
}

export function ThemeRestoreModal({ open, onClose, themeTitle, score, onConfirm }: ThemeRestoreModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Restaurar Tema"
      confirmLabel="Confirmar Restauração"
      onConfirm={() => onConfirm().then((ok) => { if (!ok) throw new Error('fail') })}
    >
      <div className="space-y-3">
        <div className="flex items-start gap-2 rounded-md border border-info-bg bg-info-bg/30 p-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#1E40AF]" />
          <p className="text-sm text-foreground">
            O tema voltará para análise com o score atual (Score: {score}).
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          Confirmar a restauração do tema &ldquo;{themeTitle}&rdquo;?
        </p>
      </div>
    </Modal>
  )
}
