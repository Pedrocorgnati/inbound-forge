import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScoreBreakdown } from '@/components/niches/ScoreBreakdown'
import { ThemeSourcesList } from './ThemeSourcesList'
import { THEME_STATUS } from '@/constants/status'

interface ContentPieceLite {
  id: string
  status: string
  recommendedChannel: string
  createdAt: string | Date
}

interface ThemeLite {
  id: string
  title: string
  status: string
  conversionScore: number
  rejectionReason: string | null
  rejectedAt: string | Date | null
  createdAt: string | Date
  updatedAt: string | Date
  scoreBreakdown: unknown
  pain: { id: string; title: string; description: string } | null
  case: { id: string; name: string; outcome: string } | null
  solutionPattern: { id: string; name: string; description: string } | null
  nicheOpportunity: { id: string; isGeoReady: boolean } | null
  contentPieces: ContentPieceLite[]
}

interface Source {
  id: string
  url: string
  title: string | null
  createdAt: string | Date
  scoreContribution: number | null
}

interface ThemeDetailPanelProps {
  theme: ThemeLite
  sources: Source[]
  locale: string
}

export function ThemeDetailPanel({ theme, sources, locale }: ThemeDetailPanelProps) {
  const isRejected = theme.status === THEME_STATUS.REJECTED

  return (
    <div className="space-y-6" data-testid="theme-detail-panel">
      <div className="flex items-center justify-between gap-3">
        <Button asChild variant="outline" size="sm">
          <Link href={`/${locale}/dashboard`}>
            <ArrowLeft className="h-4 w-4" />
            Voltar ao dashboard
          </Link>
        </Button>
        <Badge variant={isRejected ? 'danger' : 'success'}>
          {isRejected ? 'Rejeitado' : theme.status}
        </Badge>
      </div>

      <header className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground">{theme.title}</h1>
        <p className="text-sm text-muted-foreground">
          Criado em {new Date(theme.createdAt).toLocaleDateString()} &middot; Score{' '}
          {theme.conversionScore}
        </p>
        {isRejected && theme.rejectionReason && (
          <p className="text-sm italic text-muted-foreground">
            Motivo da rejeicao: {theme.rejectionReason}
          </p>
        )}
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        {theme.pain && (
          <div className="rounded-md border border-border bg-background p-4">
            <h3 className="text-sm font-semibold">Dor</h3>
            <p className="text-sm text-muted-foreground">{theme.pain.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">{theme.pain.description}</p>
          </div>
        )}
        {theme.case && (
          <div className="rounded-md border border-border bg-background p-4">
            <h3 className="text-sm font-semibold">Caso</h3>
            <p className="text-sm text-muted-foreground">{theme.case.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">{theme.case.outcome}</p>
          </div>
        )}
        {theme.solutionPattern && (
          <div className="rounded-md border border-border bg-background p-4">
            <h3 className="text-sm font-semibold">Padrao de solucao</h3>
            <p className="text-sm text-muted-foreground">{theme.solutionPattern.name}</p>
          </div>
        )}
        {theme.nicheOpportunity && (
          <div className="rounded-md border border-border bg-background p-4">
            <h3 className="text-sm font-semibold">Nicho</h3>
            <p className="text-sm text-muted-foreground">
              GEO Ready: {theme.nicheOpportunity.isGeoReady ? 'Sim' : 'Nao'}
            </p>
          </div>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Score breakdown</h2>
        <ScoreBreakdown
          breakdown={theme.scoreBreakdown as Parameters<typeof ScoreBreakdown>[0]['breakdown']}
          finalScore={theme.conversionScore}
        />
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Fontes coletadas</h2>
        <ThemeSourcesList sources={sources} />
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Conteudos derivados</h2>
        {theme.contentPieces.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum conteudo gerado ainda.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {theme.contentPieces.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3">
                <span>
                  {c.recommendedChannel} &middot; {c.status}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(c.createdAt).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
