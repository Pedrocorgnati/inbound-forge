'use client'

import useSWR from 'swr'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface AsovAggregate {
  globalRate: number
  totalProbes: number
  totalMentions: number
  themes: Array<{ themeId: string; rate: number; total: number; mentions: number }>
}

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

const fetcher = (url: string) => fetch(url).then((r) => r.json() as Promise<ApiResponse<AsovAggregate>>)

export function ASoVCard() {
  const { data, mutate, isLoading } = useSWR('/api/v1/analytics/asov?period=30d', fetcher, {
    refreshInterval: 60_000,
  })

  const agg = data?.data
  const pct = agg ? Math.round(agg.globalRate * 100) : 0

  return (
    <Card data-testid="asov-card">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div>
          <CardTitle className="text-sm font-semibold">AI Share of Voice (30d)</CardTitle>
          <p className="text-xs text-muted-foreground">
            Citações do blog em LLMs públicos (Perplexity, ChatGPT Search, Gemini)
          </p>
        </div>
        <Badge variant={pct >= 20 ? 'success' : pct >= 5 ? 'warning' : 'default'}>
          {pct}%
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : !agg || agg.totalProbes === 0 ? (
          <p className="text-sm text-muted-foreground">
            Ainda sem probes. Rode um manual para popular a métrica.
          </p>
        ) : (
          <>
            <div className="text-xs text-muted-foreground">
              {agg.totalMentions} mencões em {agg.totalProbes} probes
            </div>
            <ul className="space-y-1 text-xs">
              {agg.themes.slice(0, 5).map((t) => (
                <li key={t.themeId} className="flex justify-between">
                  <span className="font-mono truncate max-w-[60%]">{t.themeId.slice(0, 8)}</span>
                  <span>{Math.round(t.rate * 100)}%</span>
                </li>
              ))}
            </ul>
          </>
        )}
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            mutate()
          }}
        >
          Atualizar
        </Button>
      </CardContent>
    </Card>
  )
}
