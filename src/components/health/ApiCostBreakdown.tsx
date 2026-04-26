'use client'

// TASK-3 ST001 — Cost breakdown por provedor com severidade visual
// Rastreabilidade: CL-091

import React from 'react'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/utils'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { DollarSign } from 'lucide-react'
import { useApiUsage } from '@/hooks/useApiUsage'

type Severity = 'ok' | 'warn' | 'critical'

function severityFor(percent: number): Severity {
  if (percent >= 100) return 'critical'
  if (percent >= 80) return 'warn'
  return 'ok'
}

const SEVERITY_COLOR: Record<Severity, string> = {
  ok: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  warn: 'bg-amber-100 text-amber-800 border-amber-300',
  critical: 'bg-red-100 text-red-800 border-red-300',
}

const SEVERITY_LABEL: Record<Severity, string> = {
  ok: 'Ok',
  warn: 'Atencao',
  critical: 'Critico',
}

export function ApiCostBreakdown() {
  const { data, isLoading, error, totalCostUSD } = useApiUsage('month')

  return (
    <Card data-testid="api-cost-breakdown">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <DollarSign className="h-4 w-4 text-muted-foreground" />
          Custo do Mes
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton variant="rectangle" className="h-8 w-full" />
            <Skeleton variant="rectangle" className="h-8 w-full" />
          </div>
        ) : error ? (
          <p className="text-sm text-danger">{error}</p>
        ) : data.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Sem consumo registrado este mes.
          </p>
        ) : (
          <>
            <table className="w-full text-sm" data-testid="cost-table">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="py-1">Provedor</th>
                  <th className="py-1 text-right">Custo</th>
                  <th className="py-1 text-right">% Uso</th>
                  <th className="py-1 text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.map((item) => {
                  const sev = severityFor(item.percentUsed)
                  return (
                    <tr
                      key={item.service}
                      data-testid={`cost-row-${item.service}`}
                      className="border-b border-border/50"
                    >
                      <td className="py-2 font-medium">{item.service}</td>
                      <td className="py-2 text-right tabular-nums">
                        {/* TASK-14 ST002 (CL-210): API costs em USD canonico via formatCurrency */}
                        {formatCurrency(item.costUSD, 'USD')}
                      </td>
                      <td className="py-2 text-right tabular-nums">
                        {item.percentUsed.toFixed(0)}%
                      </td>
                      <td className="py-2 text-right">
                        <span
                          data-testid={`cost-severity-${item.service}`}
                          className={cn(
                            'inline-block rounded border px-2 py-0.5 text-[10px] font-medium',
                            SEVERITY_COLOR[sev]
                          )}
                        >
                          {SEVERITY_LABEL[sev]}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <div className="mt-3 flex items-center justify-between border-t border-border pt-2">
              <span className="text-sm font-medium">Total</span>
              <span className="text-sm font-bold tabular-nums">
                {formatCurrency(totalCostUSD, 'USD')}
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
