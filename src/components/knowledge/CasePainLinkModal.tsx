'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'
import { AlertTriangle } from 'lucide-react'
import type { CaseResponse } from '@/lib/dtos/case-library.dto'

interface CasePainLinkModalProps {
  isOpen: boolean
  onClose: () => void
  painId: string
  painTitle: string
  currentCaseIds: string[]
  locale: string
  onSuccess: () => void
}

export function CasePainLinkModal({
  isOpen,
  onClose,
  painId,
  painTitle,
  currentCaseIds,
  locale: _locale,
  onSuccess,
}: CasePainLinkModalProps) {
  const [cases, setCases] = useState<CaseResponse[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(currentCaseIds))
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const originalIdsRef = useRef<string[]>(currentCaseIds)

  const fetchCases = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const [casesRes, linkedRes] = await Promise.all([
        fetch('/api/knowledge/cases?limit=100'),
        fetch(`/api/knowledge/pains/${painId}/cases`),
      ])
      if (!casesRes.ok) throw new Error('Falha ao carregar cases')

      const casesJson = await casesRes.json()
      setCases(casesJson.data ?? [])

      if (linkedRes.ok) {
        const linkedJson = await linkedRes.json()
        const linkedIds: string[] = linkedJson.data ?? []
        originalIdsRef.current = linkedIds
        setSelectedIds(new Set(linkedIds))
      } else {
        originalIdsRef.current = currentCaseIds
        setSelectedIds(new Set(currentCaseIds))
      }
    } catch {
      setError('Não foi possível carregar os cases.')
    } finally {
      setIsLoading(false)
    }
  }, [painId, currentCaseIds])

  // Fetch cases on open
  useEffect(() => {
    if (isOpen) {
      fetchCases()
    }
  }, [isOpen, fetchCases])

  function handleToggle(caseId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(caseId)) {
        next.delete(caseId)
      } else {
        next.add(caseId)
      }
      return next
    })
  }

  async function handleSave() {
    setIsSaving(true)

    const originalSet = new Set(originalIdsRef.current)
    const toLink = Array.from(selectedIds).filter((id) => !originalSet.has(id))
    const toUnlink = originalIdsRef.current.filter((id) => !selectedIds.has(id))

    let successCount = 0
    let errorCount = 0

    // Link new cases
    for (const caseId of toLink) {
      try {
        const res = await fetch(`/api/knowledge/pains/${painId}/cases`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ caseId }),
        })
        if (!res.ok) throw new Error()
        successCount++
      } catch {
        errorCount++
      }
    }

    // Unlink removed cases
    for (const caseId of toUnlink) {
      try {
        const res = await fetch(`/api/knowledge/pains/${painId}/cases`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ caseId }),
        })
        if (!res.ok) throw new Error()
        successCount++
      } catch {
        errorCount++
      }
    }

    if (errorCount > 0) {
      toast.error(`${errorCount} operação(ões) falharam. ${successCount} concluídas.`)
    } else if (successCount > 0) {
      toast.success(`${successCount} vínculo(s) atualizado(s) com sucesso`)
    } else {
      toast.info('Nenhuma alteração realizada')
    }

    setIsSaving(false)
    onSuccess()
    onClose()
  }

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Vincular Cases"
      description={`Selecione os cases que devem ser vinculados à dor "${painTitle}".`}
      size="lg"
    >
      <div data-testid="case-pain-link-modal" className="space-y-4">
        {/* Error state */}
        {error && !isLoading && (
          <div
            className="flex items-center gap-2 rounded-md border border-danger/20 bg-danger/10 px-4 py-3"
            role="alert"
          >
            <AlertTriangle className="h-4 w-4 shrink-0 text-danger" aria-hidden />
            <p className="text-sm text-danger">{error}</p>
            <Button variant="ghost" size="sm" onClick={fetchCases} className="ml-auto">
              Tentar novamente
            </Button>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-md bg-muted" />
            ))}
          </div>
        )}

        {/* Cases list */}
        {!isLoading && !error && (
          <div className="max-h-[320px] space-y-1 overflow-y-auto pr-1">
            {cases.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Nenhum case disponível. Crie um case primeiro.
              </p>
            ) : (
              cases.map((c) => (
                <label
                  key={c.id}
                  className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-muted/50 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(c.id)}
                    onChange={() => handleToggle(c.id)}
                    className="h-4 w-4 rounded border-input text-primary focus:ring-2 focus:ring-ring"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{c.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {c.sector} · {c.systemType}
                    </p>
                  </div>
                </label>
              ))
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 border-t border-border pt-4">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            isLoading={isSaving}
            loadingText="Salvando..."
            disabled={isLoading || !!error}
            data-testid="case-pain-link-save"
          >
            Salvar Vínculos
          </Button>
        </div>
      </div>
    </Modal>
  )
}
