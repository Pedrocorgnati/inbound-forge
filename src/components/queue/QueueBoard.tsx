'use client'

import useSWR from 'swr'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface QueueItem {
  id: string
  title: string
  status: 'PENDING' | 'PROCESSING' | 'SCHEDULED' | 'PUBLISHED' | 'FAILED'
  scheduledAt: string | null
}

interface ApiResponse<T> { success: boolean; data?: T; error?: string }

const fetcher = (url: string) =>
  fetch(url).then((r) => r.json() as Promise<ApiResponse<QueueItem[]>>)

export function QueueBoard() {
  const { data, isLoading, mutate } = useSWR('/api/v1/publishing-queue', fetcher, {
    refreshInterval: 10_000,
  })

  const items = data?.data ?? []
  const columns: QueueItem['status'][] = ['PENDING', 'PROCESSING', 'SCHEDULED', 'PUBLISHED']

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Carregando fila...</p>
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4" data-testid="queue-board">
      {columns.map((col) => {
        const cards = items.filter((i) => i.status === col)
        return (
          <Card key={col}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold">{col}</CardTitle>
              <Badge variant="default">{cards.length}</Badge>
            </CardHeader>
            <CardContent className="space-y-2">
              {cards.length === 0 ? (
                <p className="text-xs text-muted-foreground">—</p>
              ) : (
                cards.map((c) => (
                  <div
                    key={c.id}
                    draggable
                    onDragEnd={() => mutate()}
                    className="rounded border bg-card p-2 text-xs cursor-grab active:cursor-grabbing"
                  >
                    {c.title}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
