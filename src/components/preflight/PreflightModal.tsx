'use client'

/**
 * PreflightModal — modal compartilhado exibido antes de QUALQUER acao sensivel.
 *
 * Dois modos:
 *  - 'generation' (kinds: angles | content | art): geracoes pagas (Claude/Ideogram/Flux).
 *    Mostra tokens/imagens, custo USD, quota mensal restante e timeout. So permite
 *    confirmar quando ha orcamento (Zero Assumido em chamada paga).
 *  - 'operation' (kinds: kill-switch | worker-restart | ga4-refresh | translate):
 *    acoes operacionais sensiveis (TAREFA-020). Mostra IMPACTO declarado — gravidade,
 *    downtime, escopo, reversibilidade, custo — e exige dupla confirmacao explicita
 *    quando a acao e perigosa (kill-switch, restart).
 *
 * Rastreabilidade: loop 05-27-inbound-forge-user-friendly TASK-003 (P0) + TAREFA-020 (P2).
 * Consumido por paineis Angulos/Conteudo/Arte e pelas acoes admin/ops.
 */
import * as React from 'react'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import type { PreflightEstimate, PreflightKind } from '@/lib/preflight/quota'
import type { ImpactSeverity, OperationImpact, OperationKind } from '@/lib/preflight/operations'

const OPERATION_KINDS: readonly OperationKind[] = [
  'kill-switch',
  'worker-restart',
  'ga4-refresh',
  'translate',
]

const OPERATION_ENDPOINTS: Record<OperationKind, string> = {
  'kill-switch': '/api/v1/admin/kill-switch/preflight',
  'worker-restart': '/api/v1/admin/workers/restart/preflight',
  'ga4-refresh': '/api/v1/analytics/ga4/refresh/preflight',
  translate: '/api/v1/translate/preflight',
}

function isOperationKind(kind: PreflightKind | OperationKind): kind is OperationKind {
  return (OPERATION_KINDS as readonly string[]).includes(kind)
}

export interface PreflightParams {
  themeId?: string
  contentPieceId?: string
  templateType?: string
  count?: number
}

export interface PreflightModalProps {
  open: boolean
  onClose: () => void
  /** Kind de geracao (angles|content|art) ou operacional (kill-switch|worker-restart|ga4-refresh|translate). */
  kind: PreflightKind | OperationKind
  /** Corpo enviado ao endpoint de preflight. Geracao: PreflightParams; operacao: payload tipado da acao. */
  params?: PreflightParams | Record<string, unknown>
  /** Override do endpoint. Default: /api/v1/{kind}/preflight (geracao) ou mapa fixo (operacao). */
  endpoint?: string
  /** Disparado quando o operador confirma (ja com impacto/orcamento validado). */
  onConfirm: () => void | Promise<void>
}

type FetchState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready-generation'; estimate: PreflightEstimate }
  | { status: 'ready-operation'; impact: OperationImpact }

const USD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 4 })

const SEVERITY_CLASS: Record<ImpactSeverity, string> = {
  low: 'text-muted-foreground',
  medium: 'text-foreground',
  high: 'text-warning',
  critical: 'text-destructive',
}

export function PreflightModal({ open, onClose, kind, params, endpoint, onConfirm }: PreflightModalProps) {
  const t = useTranslations('preflight')
  const locale = useLocale()
  const [state, setState] = React.useState<FetchState>({ status: 'loading' })
  const [acknowledged, setAcknowledged] = React.useState(false)

  const operationMode = isOperationKind(kind)
  const resolvedEndpoint =
    endpoint ?? (operationMode ? OPERATION_ENDPOINTS[kind] : `/api/v1/${kind}/preflight`)

  const fetchEstimate = React.useCallback(async () => {
    setState({ status: 'loading' })
    try {
      const res = await fetch(resolvedEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params ?? {}),
      })
      const json = (await res.json().catch(() => null)) as
        | { success: boolean; data?: PreflightEstimate | OperationImpact; error?: string }
        | null

      if (!res.ok || !json?.success || !json.data) {
        setState({ status: 'error', message: json?.error ?? t('errorBody') })
        return
      }
      if (operationMode) {
        setState({ status: 'ready-operation', impact: json.data as OperationImpact })
      } else {
        setState({ status: 'ready-generation', estimate: json.data as PreflightEstimate })
      }
    } catch {
      setState({ status: 'error', message: t('errorBody') })
    }
  }, [resolvedEndpoint, params, operationMode, t])

  React.useEffect(() => {
    if (open) {
      setAcknowledged(false)
      void fetchEstimate()
    }
  }, [open, fetchEstimate])

  async function handleConfirm() {
    await onConfirm()
  }

  // -------------------------------------------------------------------------
  // Modo operacional (TAREFA-020)
  // -------------------------------------------------------------------------
  if (operationMode) {
    const impact = state.status === 'ready-operation' ? state.impact : null
    const requiresDoubleConfirm = impact?.requires_double_confirm === true
    const canConfirm =
      impact?.can_proceed === true && (!requiresDoubleConfirm || acknowledged)

    return (
      <Modal
        open={open}
        onClose={onClose}
        title={t(`operations.kinds.${kind}.title`)}
        description={t(`operations.kinds.${kind}.subtitle`)}
        confirmLabel={t('operations.confirm')}
        cancelLabel={t('cancel')}
        size="md"
        isDestructive={impact?.severity === 'high' || impact?.severity === 'critical'}
        onConfirm={impact && canConfirm ? handleConfirm : undefined}
      >
        <div data-testid="preflight-modal-body" className="space-y-4">
          {state.status === 'loading' && (
            <p data-testid="preflight-loading" className="text-sm text-muted-foreground">
              {t('loading')}
            </p>
          )}

          {state.status === 'error' && (
            <div data-testid="preflight-error" className="space-y-3">
              <p className="text-sm font-medium text-destructive">{t('errorTitle')}</p>
              <p className="text-sm text-muted-foreground">{state.message}</p>
              <Button variant="outline" size="sm" onClick={() => void fetchEstimate()}>
                {t('retry')}
              </Button>
            </div>
          )}

          {impact && (
            <>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <dt className="text-muted-foreground">{t('operations.severity')}</dt>
                <dd
                  data-testid="preflight-severity"
                  className={`text-right font-medium ${SEVERITY_CLASS[impact.severity]}`}
                >
                  {t(`operations.severityLevel.${impact.severity}`)}
                </dd>

                <dt className="text-muted-foreground">{t('operations.downtime')}</dt>
                <dd data-testid="preflight-downtime" className="text-right font-medium">
                  {impact.downtime_ms > 0
                    ? t('seconds', { value: Math.round(impact.downtime_ms / 1000) })
                    : t('operations.noDowntime')}
                </dd>

                {impact.estimated_cost_usd > 0 && (
                  <>
                    <dt className="text-muted-foreground">{t('operations.cost')}</dt>
                    <dd data-testid="preflight-op-cost" className="text-right font-medium">
                      {USD.format(impact.estimated_cost_usd)}
                    </dd>

                    <dt className="text-muted-foreground">{t('operations.quotaRemaining')}</dt>
                    <dd
                      data-testid="preflight-op-quota"
                      className={`text-right font-medium ${impact.can_proceed ? '' : 'text-destructive'}`}
                    >
                      {USD.format(impact.quota_remaining)}
                    </dd>
                  </>
                )}

                <dt className="text-muted-foreground">{t('operations.reversible')}</dt>
                <dd data-testid="preflight-reversible" className="text-right font-medium">
                  {impact.reversible ? t('operations.yes') : t('operations.no')}
                </dd>
              </dl>

              <div data-testid="preflight-scope" className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t('operations.scope')}
                </p>
                <ul className="flex flex-wrap gap-1.5">
                  {impact.scope.map((item) => (
                    <li
                      key={item}
                      className="rounded border border-border bg-muted px-2 py-0.5 text-xs text-foreground"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {impact.warnings.length > 0 && (
                <ul data-testid="preflight-warnings" className="space-y-1.5 rounded-md border border-warning/40 bg-warning/5 p-3">
                  {impact.warnings.map((w) => (
                    <li key={w} className="text-sm text-foreground">
                      {t(`operations.warnings.${w}`)}
                    </li>
                  ))}
                </ul>
              )}

              {!impact.can_proceed && (
                <div data-testid="preflight-blocked" className="space-y-1 rounded-md border border-destructive/40 bg-destructive/5 p-3">
                  <p className="text-sm font-medium text-destructive">{t('operations.blockedTitle')}</p>
                  <p className="text-sm text-muted-foreground">{t('operations.blockedBody')}</p>
                </div>
              )}

              {impact.can_proceed && requiresDoubleConfirm && (
                <label
                  htmlFor="preflight-ack"
                  className="flex cursor-pointer items-center gap-2 text-sm text-foreground"
                >
                  <Checkbox
                    id="preflight-ack"
                    data-testid="preflight-double-confirm"
                    checked={acknowledged}
                    onCheckedChange={(v) => setAcknowledged(v === true)}
                  />
                  {t('operations.doubleConfirm')}
                </label>
              )}
            </>
          )}
        </div>
      </Modal>
    )
  }

  // -------------------------------------------------------------------------
  // Modo geracao (TAREFA-003) — comportamento preservado
  // -------------------------------------------------------------------------
  const estimate = state.status === 'ready-generation' ? state.estimate : null
  const canProceed = estimate?.can_proceed === true
  const generationParams = params as PreflightParams | undefined

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('title')}
      description={t(`subtitle.${kind}`)}
      confirmLabel={t('confirm')}
      cancelLabel={t('cancel')}
      size="md"
      onConfirm={estimate && canProceed ? handleConfirm : undefined}
    >
      <div data-testid="preflight-modal-body" className="space-y-4">
        {state.status === 'loading' && (
          <p data-testid="preflight-loading" className="text-sm text-muted-foreground">
            {t('loading')}
          </p>
        )}

        {state.status === 'error' && (
          <div data-testid="preflight-error" className="space-y-3">
            <p className="text-sm font-medium text-destructive">{t('errorTitle')}</p>
            <p className="text-sm text-muted-foreground">{state.message}</p>
            <Button variant="outline" size="sm" onClick={() => void fetchEstimate()}>
              {t('retry')}
            </Button>
          </div>
        )}

        {estimate && (
          <>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              {kind === 'art' ? (
                <>
                  <dt className="text-muted-foreground">{t('estimatedImages')}</dt>
                  <dd data-testid="preflight-images" className="text-right font-medium">
                    {Math.max(1, generationParams?.count ?? 1)}
                  </dd>
                </>
              ) : (
                <>
                  <dt className="text-muted-foreground">{t('estimatedTokens')}</dt>
                  <dd data-testid="preflight-tokens" className="text-right font-medium">
                    {estimate.estimated_tokens.toLocaleString(locale)}
                  </dd>
                </>
              )}

              <dt className="text-muted-foreground">{t('estimatedCost')}</dt>
              <dd data-testid="preflight-cost" className="text-right font-medium">
                {USD.format(estimate.estimated_cost_usd)}
              </dd>

              <dt className="text-muted-foreground">{t('quotaRemaining')}</dt>
              <dd
                data-testid="preflight-quota"
                className={`text-right font-medium ${canProceed ? '' : 'text-destructive'}`}
              >
                {USD.format(estimate.quota_remaining)}
              </dd>

              <dt className="text-muted-foreground">{t('timeout')}</dt>
              <dd data-testid="preflight-timeout" className="text-right font-medium">
                {t('seconds', { value: Math.round(estimate.timeout_ms / 1000) })}
              </dd>
            </dl>

            {!canProceed && (
              <div data-testid="preflight-blocked" className="space-y-2 rounded-md border border-destructive/40 bg-destructive/5 p-3">
                <p className="text-sm font-medium text-destructive">{t('blockedTitle')}</p>
                <p className="text-sm text-muted-foreground">{t('blockedBody')}</p>
                <Link
                  href={`/${locale}/settings/billing`}
                  className="inline-flex items-center text-sm font-medium text-primary underline-offset-4 hover:underline"
                >
                  {t('goToBilling')}
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  )
}
