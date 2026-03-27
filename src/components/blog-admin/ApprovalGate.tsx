'use client'

import * as React from 'react'
import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip'
import { MAX_META_DESCRIPTION_LENGTH } from '@/lib/constants/blog'
import type { BlogArticle } from '@/types/blog'

interface ApprovalGateProps {
  article: BlogArticle
  onApprove: () => void
  isApproving: boolean
}

interface CheckItem {
  label: string
  passed: boolean
  reason: string
}

function buildChecklist(article: BlogArticle): CheckItem[] {
  return [
    {
      label: 'Meta titulo preenchido',
      passed: Boolean(article.metaTitle && article.metaTitle.trim().length > 0),
      reason: 'O campo metaTitle deve estar preenchido',
    },
    {
      label: `Meta descricao <= ${MAX_META_DESCRIPTION_LENGTH} caracteres`,
      passed: Boolean(
        article.metaDescription &&
          article.metaDescription.trim().length > 0 &&
          article.metaDescription.length <= MAX_META_DESCRIPTION_LENGTH
      ),
      reason: `metaDescription deve ter entre 1 e ${MAX_META_DESCRIPTION_LENGTH} caracteres`,
    },
    {
      label: 'Imagem de capa presente',
      passed: Boolean(article.featuredImageUrl && article.featuredImageUrl.trim().length > 0),
      reason: 'O artigo precisa de uma imagem de capa (featuredImageUrl)',
    },
  ]
}

export function ApprovalGate({ article, onApprove, isApproving }: ApprovalGateProps) {
  const [showConfirm, setShowConfirm] = React.useState(false)
  const checklist = buildChecklist(article)
  const allPassed = checklist.every((c) => c.passed)
  const failedItems = checklist.filter((c) => !c.passed)

  const tooltipMessage = allPassed
    ? 'Todos os criterios atendidos'
    : `Pendencias: ${failedItems.map((c) => c.label).join(', ')}`

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold">Checklist de Aprovacao</h3>

      <ul className="space-y-2">
        {checklist.map((item) => (
          <li key={item.label} className="flex items-start gap-2 text-sm">
            {item.passed ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" aria-hidden />
            ) : (
              <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden />
            )}
            <div>
              <span className={item.passed ? 'text-foreground' : 'text-red-600 font-medium'}>
                {item.label}
              </span>
              {!item.passed && (
                <p className="text-xs text-muted-foreground">{item.reason}</p>
              )}
            </div>
          </li>
        ))}
      </ul>

      {!allPassed && (
        <div className="flex items-start gap-2 rounded-md bg-warning-bg/50 p-3 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
          <p className="text-amber-800">
            Resolva as pendencias acima antes de aprovar o artigo.
          </p>
        </div>
      )}

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-block">
              <Button
                onClick={() => setShowConfirm(true)}
                disabled={!allPassed || isApproving}
                isLoading={isApproving}
                loadingText="Aprovando..."
              >
                Aprovar Artigo
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>{tooltipMessage}</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Modal
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        title="Confirmar Aprovacao"
        description="Apos aprovado, o artigo ficara disponivel para publicacao. Deseja continuar?"
        onConfirm={onApprove}
        confirmLabel="Sim, aprovar"
        cancelLabel="Cancelar"
      />
    </div>
  )
}
