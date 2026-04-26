'use client'

// TASK-11 (CL-249): tabela de NicheOpportunity com actions approve/discard.

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { NicheActionDialog } from './NicheActionDialog'

interface Opp {
  id: string
  sector: string
  painCategory: string
  potentialScore: number
  isGeoReady: boolean
  status: string
  createdAt: string
}

interface ApiResp { success: boolean; data: Opp[]; pagination: { total: number } }

interface NicheOpportunityTableProps {
  status?: 'NEW' | 'APPROVED' | 'DISCARDED'
}

export function NicheOpportunityTable({ status = 'NEW' }: NicheOpportunityTableProps) {
  const qc = useQueryClient()
  const [action, setAction] = useState<{ opp: Opp; kind: 'approve' | 'discard' } | null>(null)

  const { data, isLoading, error } = useQuery<ApiResp>({
    queryKey: ['niche-opportunities', status],
    queryFn: async () => {
      const res = await fetch(`/api/v1/niche-opportunities?status=${status}`)
      if (!res.ok) throw new Error(`Falha ao carregar (${res.status})`)
      return res.json()
    },
  })

  if (isLoading) return <div className="h-40 animate-pulse rounded-md bg-muted/40" />
  if (error) return <p className="text-sm text-destructive">Erro ao carregar.</p>

  const rows = data?.data ?? []

  return (
    <>
      <div className="overflow-x-auto rounded-md border border-border" data-testid="niche-opps-table">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">Setor</th>
              <th className="px-3 py-2 text-left">Categoria de dor</th>
              <th className="px-3 py-2 text-right">Score</th>
              <th className="px-3 py-2 text-center">GEO</th>
              <th className="px-3 py-2 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                  Nenhuma oportunidade {status.toLowerCase()}.
                </td>
              </tr>
            )}
            {rows.map((opp) => (
              <tr key={opp.id} className="border-t border-border">
                <td className="px-3 py-2">{opp.sector}</td>
                <td className="px-3 py-2">{opp.painCategory}</td>
                <td className="px-3 py-2 text-right font-mono">{opp.potentialScore.toFixed(2)}</td>
                <td className="px-3 py-2 text-center">{opp.isGeoReady ? '✓' : '—'}</td>
                <td className="px-3 py-2 text-right">
                  {status === 'NEW' && (
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setAction({ opp, kind: 'approve' })}
                        className="rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground"
                        data-testid={`approve-${opp.id}`}
                      >
                        Aprovar
                      </button>
                      <button
                        type="button"
                        onClick={() => setAction({ opp, kind: 'discard' })}
                        className="rounded-md border border-border px-2 py-1 text-xs text-destructive"
                        data-testid={`discard-${opp.id}`}
                      >
                        Descartar
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {action && (
        <NicheActionDialog
          kind={action.kind}
          opportunity={action.opp}
          onClose={() => setAction(null)}
          onDone={() => {
            setAction(null)
            qc.invalidateQueries({ queryKey: ['niche-opportunities'] })
          }}
        />
      )}
    </>
  )
}
