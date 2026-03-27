'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { RotateCcw, GitCompareArrows } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { DiffViewer } from './DiffViewer'
import { RollbackConfirmModal } from './RollbackConfirmModal'
import { formatDateTime } from '@/lib/utils'
import type { BlogArticleVersion } from '@/types/blog'

interface VersionHistoryProps {
  articleId: string
  currentTitle: string
  currentBody: string
}

export function VersionHistory({
  articleId,
  currentTitle,
  currentBody,
}: VersionHistoryProps) {
  const [versions, setVersions] = React.useState<BlogArticleVersion[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [compareVersionId, setCompareVersionId] = React.useState<string | null>(null)
  const [rollbackVersion, setRollbackVersion] = React.useState<BlogArticleVersion | null>(null)

  const fetchVersions = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/blog-articles/${articleId}/versions`)
      if (!res.ok) throw new Error('Erro ao carregar versoes')
      const data: BlogArticleVersion[] = await res.json()
      setVersions(data.sort((a, b) => b.versionNumber - a.versionNumber))
    } catch {
      toast.error('Falha ao carregar historico de versoes')
    } finally {
      setIsLoading(false)
    }
  }, [articleId])

  React.useEffect(() => {
    fetchVersions()
  }, [fetchVersions])

  function handleCompareToggle(versionId: string) {
    setCompareVersionId((prev) => (prev === versionId ? null : versionId))
  }

  function handleRollbackSuccess() {
    setRollbackVersion(null)
    setCompareVersionId(null)
    fetchVersions()
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border p-4 space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        ))}
      </div>
    )
  }

  if (versions.length === 0) {
    return (
      <div className="rounded-lg border border-border p-8 text-center">
        <p className="text-muted-foreground">
          Este artigo nao tem versoes anteriores.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="relative space-y-4">
        {/* Timeline vertical line */}
        <div className="absolute left-4 top-0 bottom-0 w-px bg-border hidden sm:block" />

        {versions.map((version) => {
          const isComparing = compareVersionId === version.id

          return (
            <div key={version.id} className="relative sm:pl-10">
              {/* Timeline dot */}
              <div className="absolute left-[11px] top-5 h-[10px] w-[10px] rounded-full border-2 border-primary bg-background hidden sm:block" />

              <div className="rounded-lg border border-border p-4 space-y-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="primary">v{version.versionNumber}</Badge>
                    <span className="text-sm text-muted-foreground">
                      {formatDateTime(version.createdAt)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCompareToggle(version.id)}
                      aria-expanded={isComparing}
                      aria-controls={`diff-${version.id}`}
                    >
                      <GitCompareArrows className="mr-1 h-4 w-4" aria-hidden />
                      {isComparing ? 'Fechar' : 'Comparar'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setRollbackVersion(version)}
                    >
                      <RotateCcw className="mr-1 h-4 w-4" aria-hidden />
                      Restaurar
                    </Button>
                  </div>
                </div>

                <p className="text-sm font-medium">{version.title}</p>

                {version.changeNote && (
                  <p className="text-sm text-muted-foreground">
                    {version.changeNote}
                  </p>
                )}

                {isComparing && (
                  <div id={`diff-${version.id}`} className="pt-2 space-y-4">
                    <div>
                      <p className="mb-1 text-xs font-medium text-muted-foreground">
                        Titulo
                      </p>
                      <DiffViewer before={version.title} after={currentTitle} />
                    </div>
                    <div>
                      <p className="mb-1 text-xs font-medium text-muted-foreground">
                        Conteudo
                      </p>
                      <DiffViewer before={version.body} after={currentBody} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {rollbackVersion && (
        <RollbackConfirmModal
          open={Boolean(rollbackVersion)}
          onClose={() => setRollbackVersion(null)}
          articleId={articleId}
          version={rollbackVersion}
          currentTitle={currentTitle}
          currentBody={currentBody}
          onRollbackSuccess={handleRollbackSuccess}
        />
      )}
    </>
  )
}
