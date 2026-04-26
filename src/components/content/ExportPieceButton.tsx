'use client'

// ExportPieceButton — dispara download de ContentPiece como markdown ou txt.
// Intake-Review TASK-21 ST003 (CL-CS-012).

import { useState } from 'react'

type Props = {
  pieceId: string
  className?: string
}

export function ExportPieceButton({ pieceId, className }: Props) {
  const [busy, setBusy] = useState<'markdown' | 'txt' | null>(null)

  const download = (format: 'markdown' | 'txt') => {
    setBusy(format)
    const a = document.createElement('a')
    a.href = `/api/v1/content/${pieceId}/export?format=${format}`
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => setBusy(null), 400)
  }

  return (
    <div className={className} data-testid="export-piece-button">
      <button
        type="button"
        disabled={busy !== null}
        onClick={() => download('markdown')}
        className="mr-2 rounded border bg-card px-2 py-1 text-xs hover:bg-muted/40 disabled:opacity-50"
      >
        {busy === 'markdown' ? 'Preparando...' : 'Exportar .md'}
      </button>
      <button
        type="button"
        disabled={busy !== null}
        onClick={() => download('txt')}
        className="rounded border bg-card px-2 py-1 text-xs hover:bg-muted/40 disabled:opacity-50"
      >
        {busy === 'txt' ? 'Preparando...' : 'Exportar .txt'}
      </button>
    </div>
  )
}
