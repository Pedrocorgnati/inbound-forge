import { ClipboardList } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/shared/empty-state'

interface SourceLog {
  id: string
  sourceUrl: string
  textsCollected: number
  textsClassified: number
  errorsCount: number
  durationMs: number
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED'
  errorMessage: string | null
  createdAt: string
}

interface SourceLogsProps {
  logs: SourceLog[]
  auditHref: string
}

const statusVariant: Record<SourceLog['status'], 'success' | 'warning' | 'danger'> = {
  SUCCESS: 'success',
  PARTIAL: 'warning',
  FAILED: 'danger',
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('pt-BR')
}

export function SourceLogs({ logs, auditHref }: SourceLogsProps) {
  return (
    <Card variant="surface" data-testid="source-logs">
      <CardHeader>
        <CardTitle>Ultimas coletas</CardTitle>
        <CardDescription>Recorte dos eventos usados tambem pela auditoria de scraping.</CardDescription>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <EmptyState
            icon={<ClipboardList className="h-12 w-12" />}
            title="Nenhuma coleta registrada"
            description="Quando o worker processar esta fonte, os eventos recentes aparecem aqui."
            ctaLabel="Abrir auditoria"
            ctaHref={auditHref}
            className="py-6"
          />
        ) : (
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Data</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-right">Coletados</th>
                  <th className="px-3 py-2 text-right">Classificados</th>
                  <th className="px-3 py-2 text-right">Erros</th>
                  <th className="px-3 py-2 text-right">Duração</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-t border-border">
                    <td className="whitespace-nowrap px-3 py-2">{formatDate(log.createdAt)}</td>
                    <td className="px-3 py-2">
                      <Badge variant={statusVariant[log.status]}>{log.status}</Badge>
                      {log.errorMessage && (
                        <p className="mt-1 max-w-sm truncate text-xs text-danger-text">{log.errorMessage}</p>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">{log.textsCollected}</td>
                    <td className="px-3 py-2 text-right">{log.textsClassified}</td>
                    <td className="px-3 py-2 text-right">{log.errorsCount}</td>
                    <td className="px-3 py-2 text-right">{log.durationMs} ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
