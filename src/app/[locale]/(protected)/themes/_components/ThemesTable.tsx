'use client'

import Link from 'next/link'
import { ArrowUpRight, Archive, CheckCircle2, Clock3, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export interface ThemeRow {
  id: string
  title: string
  status: 'ACTIVE' | 'DEPRIORITIZED' | 'REJECTED'
  conversionScore: number
  priorityScore: number
  isNew: boolean
  createdBy: string | null
  archivedAt: string | null
  createdAt: string
  pain: { title: string } | null
  nicheOpportunity: { isGeoReady: boolean; sector?: string | null; painCategory?: string | null } | null
}

interface ThemesTableProps {
  themes: ThemeRow[]
  locale: string
}

function statusBadge(theme: ThemeRow) {
  if (theme.archivedAt) {
    return { label: 'Arquivado', variant: 'default' as const, icon: Archive }
  }
  if (theme.status === 'REJECTED') {
    return { label: 'Rejeitado', variant: 'danger' as const, icon: XCircle }
  }
  if (theme.isNew) {
    return { label: 'Pendente', variant: 'warning' as const, icon: Clock3 }
  }
  return { label: 'Aprovado', variant: 'success' as const, icon: CheckCircle2 }
}

function sourceLabel(createdBy: string | null) {
  const value = createdBy?.toLowerCase() ?? ''
  if (value.includes('rss') || value.includes('feed')) return 'RSS'
  if (value.includes('manual')) return 'Manual'
  return 'Scraping'
}

export function ThemesTable({ themes, locale }: ThemesTableProps) {
  return (
    <div className="overflow-hidden rounded-md border border-border bg-background" data-testid="themes-table">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] text-left text-sm">
          <thead className="border-b border-border bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">Tema</th>
              <th scope="col" className="px-4 py-3 font-medium">Status</th>
              <th scope="col" className="px-4 py-3 font-medium">Dor</th>
              <th scope="col" className="px-4 py-3 font-medium">Score</th>
              <th scope="col" className="px-4 py-3 font-medium">Fonte</th>
              <th scope="col" className="px-4 py-3 font-medium">Criado em</th>
              <th scope="col" className="px-4 py-3 text-right font-medium">Acao</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {themes.map((theme) => {
              const badge = statusBadge(theme)
              const Icon = badge.icon

              return (
                <tr key={theme.id} className="hover:bg-muted/30" data-testid={`themes-row-${theme.id}`}>
                  <td className="max-w-[340px] px-4 py-4">
                    <Link
                      href={`/${locale}/themes/${theme.id}`}
                      className="font-medium text-foreground hover:text-primary hover:underline"
                    >
                      {theme.title}
                    </Link>
                    {theme.nicheOpportunity?.sector && (
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        Nicho: {theme.nicheOpportunity.sector}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <Badge variant={badge.variant}>
                      <Icon className="h-3 w-3" aria-hidden />
                      {badge.label}
                    </Badge>
                  </td>
                  <td className="max-w-[220px] px-4 py-4 text-muted-foreground">
                    <span className="line-clamp-2">
                      {theme.pain?.title ?? theme.nicheOpportunity?.painCategory ?? 'Sem dor vinculada'}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground">{theme.priorityScore}</span>
                      <span className="text-xs text-muted-foreground">conv. {theme.conversionScore}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-muted-foreground">{sourceLabel(theme.createdBy)}</td>
                  <td className="px-4 py-4 text-muted-foreground">
                    {new Date(theme.createdAt).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/${locale}/themes/${theme.id}`}>
                        Abrir
                        <ArrowUpRight className="h-4 w-4" aria-hidden />
                      </Link>
                    </Button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
