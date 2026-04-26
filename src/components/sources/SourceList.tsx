'use client'

import { useEffect, useState, useCallback } from 'react'
import { AlertTriangle, Globe, Shield, ShieldAlert, Pencil, Trash2, Power, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { SkeletonCard } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/empty-state'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { SourceForm } from './SourceForm'
import type { SourceDto } from '@/lib/services/source.service'

export function SourceList() {
  const [sources, setSources] = useState<SourceDto[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<SourceDto | null>(null)
  const [_isDeleting, setIsDeleting] = useState(false)
  const [editTarget, setEditTarget] = useState<SourceDto | null>(null)
  const [showForm, setShowForm] = useState(false)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/sources')
      if (!res.ok) throw new Error('Erro ao carregar fontes')
      const json = await res.json()
      setSources(json.data ?? json.items ?? json)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleToggleActive(source: SourceDto) {
    try {
      const res = await fetch(`/api/sources/${source.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !source.isActive }),
      })
      if (!res.ok) throw new Error()
      toast.success(source.isActive ? 'Fonte desativada' : 'Fonte ativada')
      load()
    } catch {
      toast.error('Erro ao atualizar status da fonte')
    }
  }

  async function handleResetProtection(source: SourceDto) {
    try {
      const res = await fetch(`/api/sources/${source.id}/reset-protection`, { method: 'POST' })
      if (!res.ok) throw new Error()
      toast.success(`Protecao anti-bot resetada em "${source.name}"`)
      load()
    } catch {
      toast.error('Erro ao resetar protecao anti-bot')
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/sources/${deleteTarget.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.message ?? 'Erro ao remover fonte')
      }
      toast.success(`Fonte "${deleteTarget.name}" removida`)
      setDeleteTarget(null)
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao remover fonte')
    } finally {
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3" data-testid="source-list-loading">
        {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    )
  }

  if (error) {
    return (
      <div
        className="flex items-center gap-2 rounded-md border border-danger/20 bg-danger/10 px-4 py-3"
        role="alert"
        data-testid="source-list-error"
      >
        <AlertTriangle className="h-4 w-4 shrink-0 text-danger" aria-hidden />
        <p className="text-sm text-danger">{error}</p>
        <Button variant="ghost" size="sm" onClick={load} className="ml-auto">Tentar novamente</Button>
      </div>
    )
  }

  if (sources.length === 0) {
    return (
      <EmptyState
        icon={<Globe className="h-12 w-12" />}
        title="Nenhuma fonte cadastrada"
        description="Adicione fontes de scraping para que o sistema colete temas automaticamente."
        ctaLabel="Adicionar primeira fonte"
        onCtaClick={() => setShowForm(true)}
      />
    )
  }

  return (
    <>
      <div className="space-y-3" data-testid="source-list">
        {sources.map((source) => (
          <div
            key={source.id}
            data-testid={`source-item-${source.id}`}
            className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="truncate font-medium text-foreground">{source.name}</span>
                {source.isProtected && (
                  <span
                    className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning"
                    title="Fonte protegida — não pode ser removida"
                  >
                    <Shield className="h-3 w-3" aria-hidden />
                    Protegida
                  </span>
                )}
                {source.antiBotBlocked && (
                  <span
                    className="inline-flex items-center gap-1 rounded-full bg-danger/10 px-2 py-0.5 text-xs font-medium text-danger"
                    title={source.antiBotReason ? `Anti-bot: ${source.antiBotReason}` : 'Site bloqueia scraping — fonte pausada'}
                    data-testid={`source-antibot-${source.id}`}
                  >
                    <ShieldAlert className="h-3 w-3" aria-hidden />
                    Anti-bot
                  </span>
                )}
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                    source.isActive
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {source.isActive ? 'Ativa' : 'Inativa'}
                </span>
              </div>
              <p className="truncate text-sm text-muted-foreground">{source.url}</p>
              <div className="flex gap-3 text-xs text-muted-foreground">
                <span>Frequência: {source.crawlFrequency}</span>
                {source.lastCrawledAt && (
                  <span>Última coleta: {new Date(source.lastCrawledAt).toLocaleDateString('pt-BR')}</span>
                )}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {source.antiBotBlocked && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleResetProtection(source)}
                  aria-label={`Tentar novamente fonte ${source.name}`}
                  data-testid={`source-reset-${source.id}`}
                >
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                  Tentar novamente
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleToggleActive(source)}
                aria-label={source.isActive ? 'Desativar fonte' : 'Ativar fonte'}
                data-testid={`source-toggle-${source.id}`}
              >
                <Power className="h-3.5 w-3.5" aria-hidden />
                {source.isActive ? 'Desativar' : 'Ativar'}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => { setEditTarget(source); setShowForm(true) }}
                aria-label={`Editar fonte ${source.name}`}
                data-testid={`source-edit-${source.id}`}
              >
                <Pencil className="h-3.5 w-3.5" aria-hidden />
                Editar
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteTarget(source)}
                disabled={source.isProtected}
                aria-label={`Remover fonte ${source.name}`}
                data-testid={`source-delete-${source.id}`}
                className="text-danger hover:bg-danger/10 disabled:opacity-40"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
                Remover
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Form modal */}
      {showForm && (
        <SourceForm
          source={editTarget ?? undefined}
          onClose={() => { setShowForm(false); setEditTarget(null) }}
          onSuccess={() => { setShowForm(false); setEditTarget(null); load() }}
        />
      )}

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={`Remover "${deleteTarget?.name}"`}
        message="Esta ação não pode ser desfeita. A fonte e seus dados de coleta associados serão permanentemente removidos."
        confirmText="Remover"
        cancelText="Cancelar"
        variant="danger"
      />
    </>
  )
}
