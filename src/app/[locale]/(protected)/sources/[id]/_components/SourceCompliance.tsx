import { CheckCircle2, ShieldCheck, ShieldAlert, Gauge, Bot, ClipboardCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface SourceComplianceProps {
  compliance: {
    robotsTxtRespected: boolean
    browserlessConfigured: boolean
    rateLimited: boolean
    lgpdAuditEnabled: boolean
    antiBotProtectionOk: boolean
  }
}

const items = [
  {
    key: 'robotsTxtRespected',
    label: 'robots.txt respeitado',
    description: 'Coleta marcada para respeitar regras publicas do dominio.',
    Icon: ShieldCheck,
  },
  {
    key: 'browserlessConfigured',
    label: 'Browserless configurado',
    description: 'Ambiente tem suporte para fallback de navegador controlado.',
    Icon: Bot,
  },
  {
    key: 'rateLimited',
    label: 'Rate limit ativo',
    description: 'Fonte possui limite por minuto para reduzir bloqueios.',
    Icon: Gauge,
  },
  {
    key: 'lgpdAuditEnabled',
    label: 'Audit log LGPD',
    description: 'Execucoes de coleta entram no log de compliance.',
    Icon: ClipboardCheck,
  },
  {
    key: 'antiBotProtectionOk',
    label: 'Protecao anti-bot',
    description: 'Fonte nao esta bloqueada por falhas consecutivas.',
    Icon: ShieldAlert,
  },
] as const

export function SourceCompliance({ compliance }: SourceComplianceProps) {
  return (
    <Card variant="surface" data-testid="source-compliance">
      <CardHeader>
        <CardTitle>Compliance</CardTitle>
        <CardDescription>Flags operacionais da fonte e da coleta.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map(({ key, label, description, Icon }) => {
            const enabled = compliance[key]
            return (
              <div key={key} className="rounded-md border border-border p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    {enabled ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-success-text" aria-hidden />
                    ) : (
                      <Icon className="h-4 w-4 shrink-0 text-warning-text" aria-hidden />
                    )}
                    <span className="truncate text-sm font-medium">{label}</span>
                  </div>
                  <Badge variant={enabled ? 'success' : 'warning'}>{enabled ? 'OK' : 'Atenção'}</Badge>
                </div>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">{description}</p>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
