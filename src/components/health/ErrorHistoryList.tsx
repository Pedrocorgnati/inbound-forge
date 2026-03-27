'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { formatDateTime } from '@/lib/utils'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { History } from 'lucide-react'
import type { AlertLogEntry } from '@/types/health'

const PAGE_SIZE = 10

export function ErrorHistoryList() {
  const [entries, setEntries] = useState<AlertLogEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false)
  const [page, setPage] = useState(1)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  const fetchPage = useCallback(async (p: number) => {
    const offset = (p - 1) * PAGE_SIZE
    try {
      const res = await fetch(
        `/api/v1/health/alerts?resolved=true&limit=${PAGE_SIZE}&offset=${offset}`
      )
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json: AlertLogEntry[] = await res.json()
      setHasMore(json.length === PAGE_SIZE)
      return json
    } catch {
      return []
    }
  }, [])

  useEffect(() => {
    async function load() {
      const data = await fetchPage(1)
      setEntries(data)
      setIsLoading(false)
    }
    load()
  }, [fetchPage])

  async function handleLoadMore() {
    const nextPage = page + 1
    setIsLoadingMore(true)
    const data = await fetchPage(nextPage)
    setEntries((prev) => [...prev, ...data])
    setPage(nextPage)
    setIsLoadingMore(false)
  }

  return (
    <Card data-testid="error-history-list">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="h-4 w-4 text-muted-foreground" />
          Historico de Erros
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton variant="rectangle" className="h-12 w-full" />
            <Skeleton variant="rectangle" className="h-12 w-full" />
          </div>
        ) : entries.length === 0 ? (
          <div
            data-testid="error-history-empty"
            className="flex flex-col items-center gap-2 py-8 text-muted-foreground"
          >
            <History className="h-8 w-8" />
            <p className="text-sm">Nenhum erro registrado</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-border rounded-md border border-border">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  data-testid={`error-history-item-${entry.id}`}
                  className="flex items-start gap-3 px-3 py-2.5"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">{entry.message}</p>
                    <p className="text-xs text-muted-foreground">
                      {entry.service} &middot; {formatDateTime(entry.occurredAt)}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-success font-medium">Resolvido</span>
                </div>
              ))}
            </div>
            {hasMore && (
              <div className="mt-3 flex justify-center">
                <Button
                  data-testid="error-history-load-more"
                  variant="ghost"
                  size="sm"
                  onClick={handleLoadMore}
                  isLoading={isLoadingMore}
                  loadingText="Carregando..."
                >
                  Ver mais
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
