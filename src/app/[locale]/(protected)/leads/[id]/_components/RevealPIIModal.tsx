'use client'

/**
 * RevealPIIModal — TAREFA-002 (P0)
 *
 * Exige motivo (min 12 chars) + ciencia LGPD antes de revelar a PII de um lead.
 * Chama POST /api/v1/leads/[id]/reveal, que persiste o audit ANTES de retornar
 * a PII. Em sucesso, devolve ao caller o valor + TTL + correlationId.
 *
 * Zero Silencio: cada falha (validacao, sessao, lead inexistente, audit) gera
 * toast tipado. Zero Estados Indefinidos: loading/erro tratados explicitamente.
 */
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { ShieldAlert } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { uuidv7 } from '@/lib/utils/uuidv7'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/toast'

const MIN_MOTIVO = 12

export interface RevealPIIResult {
  contactInfo: string
  correlationId: string
  ttlMs: number
  ttlExpiresAt: string
}

interface RevealPIIModalProps {
  leadId: string
  open: boolean
  onClose: () => void
  onRevealed: (result: RevealPIIResult) => void
}

export function RevealPIIModal({ leadId, open, onClose, onRevealed }: RevealPIIModalProps) {
  const tToast = useTranslations('toasts')
  const [motivo, setMotivo] = useState('')
  const [lgpdAck, setLgpdAck] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const motivoTrimmed = motivo.trim()
  const motivoValid = motivoTrimmed.length >= MIN_MOTIVO
  const canSubmit = motivoValid && lgpdAck && !isSubmitting

  function reset() {
    setMotivo('')
    setLgpdAck(false)
    setIsSubmitting(false)
  }

  function handleClose() {
    if (isSubmitting) return
    reset()
    onClose()
  }

  async function handleSubmit() {
    if (!canSubmit) return
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/v1/leads/${leadId}/reveal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // /reveal embrulha o handler em withIdempotency (400 sem a key).
          'Idempotency-Key': uuidv7(),
        },
        body: JSON.stringify({ motivo: motivoTrimmed, lgpdAck: true }),
      })

      const json = await res.json().catch(() => null)

      if (!res.ok) {
        if (res.status === 401) {
          toast.error(tToast('auth.session_expired'))
        } else if (res.status === 404) {
          toast.error(tToast('lead.not_found'))
        } else if (res.status === 422) {
          toast.error(json?.error ?? tToast('lead.reveal_invalid_form'))
        } else if (res.status === 400) {
          toast.error(json?.error ?? tToast('lead.reveal_not_possible'))
        } else {
          toast.error(json?.error ?? tToast('lead.reveal_failed_retry'))
        }
        return
      }

      const data = json?.data as RevealPIIResult | undefined
      if (!data?.contactInfo) {
        toast.error(tToast('common.invalid_server_response'))
        return
      }

      toast.success(tToast('lead.contact_revealed'))
      onRevealed(data)
      reset()
      onClose()
    } catch {
      toast.error(tToast('lead.reveal_network_failed'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Revelar contato (PII)"
      description="A revelação é auditada (LGPD). Informe o motivo e confirme a ciência."
      size="md"
    >
      <div className="space-y-4" data-testid="reveal-pii-modal">
        <div className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm text-foreground">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
          <p>
            O contato será exibido temporariamente e ocultado automaticamente após o
            tempo limite. Esta ação fica registrada com seu usuário.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="reveal-motivo">Motivo da revelação</Label>
          <Textarea
            id="reveal-motivo"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ex.: Retorno de contato solicitado pelo lead em reunião."
            rows={3}
            disabled={isSubmitting}
            aria-invalid={motivo.length > 0 && !motivoValid}
            data-testid="reveal-pii-motivo"
          />
          <p
            className={
              motivo.length > 0 && !motivoValid
                ? 'text-xs text-danger'
                : 'text-xs text-muted-foreground'
            }
          >
            {motivoTrimmed.length}/{MIN_MOTIVO} caracteres mínimos.
          </p>
        </div>

        <div className="flex items-start gap-2">
          <Checkbox
            id="reveal-lgpd"
            checked={lgpdAck}
            onCheckedChange={(v) => setLgpdAck(v === true)}
            disabled={isSubmitting}
            data-testid="reveal-pii-lgpd"
          />
          <Label htmlFor="reveal-lgpd" className="text-sm font-normal leading-snug">
            Confirmo que tenho base legal (LGPD) para acessar este dado pessoal e que o
            uso será restrito à finalidade declarada.
          </Label>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            isLoading={isSubmitting}
            loadingText="Revelando..."
            data-testid="reveal-pii-submit"
          >
            Revelar contato
          </Button>
        </div>
      </div>
    </Modal>
  )
}
