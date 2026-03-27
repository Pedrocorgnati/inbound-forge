'use client'

import { useState } from 'react'
import { CheckCircle, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ContentRejectModal } from './ContentRejectModal'

interface ApprovalPanelProps {
  status: string | null
  selectedAngleId: string | null
  isGenerating: boolean
  onApprove: (angleId: string) => Promise<boolean>
  onReject: (reason: string) => Promise<boolean>
  className?: string
}

const APPROVABLE_STATUSES = new Set(['DRAFT', 'REVIEW'])

export function ApprovalPanel({
  status,
  selectedAngleId,
  isGenerating,
  onApprove,
  onReject,
  className,
}: ApprovalPanelProps) {
  const [isApproving, setIsApproving] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [approvedMessage, setApprovedMessage] = useState(false)

  const canApprove =
    selectedAngleId !== null &&
    status !== null &&
    APPROVABLE_STATUSES.has(status) &&
    !isGenerating

  async function handleApprove() {
    if (!selectedAngleId) return
    setIsApproving(true)
    try {
      const ok = await onApprove(selectedAngleId)
      if (ok) {
        setApprovedMessage(true)
        setTimeout(() => setApprovedMessage(false), 4000)
      }
    } finally {
      setIsApproving(false)
    }
  }

  if (status === 'APPROVED' || approvedMessage) {
    return (
      <Card
        className={cn('flex items-center gap-3 p-4 border-success-bg bg-success-bg/10', className)}
        data-testid="approval-success-banner"
      >
        <CheckCircle className="h-5 w-5 text-[#065F46]" />
        <span className="text-sm font-medium text-[#065F46]">Conteúdo aprovado</span>
      </Card>
    )
  }

  if (status === 'REJECTED') {
    return (
      <Card
        className={cn('flex items-center gap-3 p-4 border-danger-bg bg-danger-bg/10', className)}
        data-testid="rejection-banner"
      >
        <XCircle className="h-5 w-5 text-[#991B1B]" />
        <span className="text-sm font-medium text-[#991B1B]">Conteúdo rejeitado — gere novamente com as correções</span>
      </Card>
    )
  }

  return (
    <>
      <Card className={cn('flex items-center gap-3 p-4', className)} data-testid="approval-panel">
        <Button
          onClick={handleApprove}
          disabled={!canApprove}
          isLoading={isApproving}
          loadingText="Aprovando..."
          data-testid="approve-btn"
        >
          <CheckCircle className="h-4 w-4" />
          Aprovar
        </Button>

        <Button
          variant="outline"
          onClick={() => setRejectOpen(true)}
          disabled={!canApprove}
          data-testid="reject-btn"
        >
          <XCircle className="h-4 w-4" />
          Rejeitar
        </Button>

        {!selectedAngleId && (
          <span className="text-xs text-muted-foreground">
            Selecione um ângulo para aprovar ou rejeitar
          </span>
        )}
      </Card>

      <ContentRejectModal
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        onConfirm={onReject}
      />
    </>
  )
}
