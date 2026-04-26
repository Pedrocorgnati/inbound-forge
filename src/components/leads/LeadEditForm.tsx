'use client'

// TASK-18 ST001 (CL-268): form completo de edicao de lead — nome, email/telefone
// (via contactInfo), empresa, status, notes. Usa PATCH em /api/v1/leads/[id].

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

const LeadEditSchema = z.object({
  name: z.string().max(255).optional().or(z.literal('')),
  company: z.string().max(255).optional().or(z.literal('')),
  contactInfo: z
    .string()
    .max(512)
    .optional()
    .or(z.literal('')),
  funnelStage: z.enum(['VISITOR', 'LEAD', 'MQL', 'SQL', 'CUSTOMER']).optional(),
  channel: z
    .enum(['ORGANIC', 'DIRECT', 'REFERRAL', 'SOCIAL', 'EMAIL', 'PAID', 'OTHER'])
    .optional(),
  notes: z.string().max(5_000).optional().or(z.literal('')),
})

export type LeadEditValues = z.infer<typeof LeadEditSchema>

interface Props {
  leadId: string
  initial: Partial<LeadEditValues>
}

export function LeadEditForm({ leadId, initial }: Props) {
  const qc = useQueryClient()
  const { register, handleSubmit, formState: { errors } } = useForm<LeadEditValues>({
    resolver: zodResolver(LeadEditSchema),
    defaultValues: initial,
  })

  const mutation = useMutation({
    mutationFn: async (data: LeadEditValues) => {
      const res = await fetch(`/api/v1/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (res.status === 409) {
        throw new Error('Email já utilizado por outro lead')
      }
      if (!res.ok) throw new Error(`Falha (${res.status})`)
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lead', leadId] })
      toast.success('Lead atualizado')
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Erro'),
  })

  return (
    <form
      onSubmit={handleSubmit((d) => mutation.mutate(d))}
      className="space-y-4 rounded-md border border-border bg-card p-4"
      data-testid="lead-edit-form"
    >
      <div>
        <label htmlFor="lead-name" className="block text-xs font-medium text-muted-foreground">
          Nome
        </label>
        <input
          id="lead-name"
          type="text"
          {...register('name')}
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
        {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>}
      </div>

      <div>
        <label htmlFor="lead-company" className="block text-xs font-medium text-muted-foreground">
          Empresa
        </label>
        <input
          id="lead-company"
          type="text"
          {...register('company')}
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label htmlFor="lead-contact" className="block text-xs font-medium text-muted-foreground">
          Contato (e-mail ou telefone)
        </label>
        <input
          id="lead-contact"
          type="text"
          placeholder="email@dominio.com ou +55 11 99999-0000"
          {...register('contactInfo')}
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Armazenado de forma criptografada (LGPD).
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="lead-stage" className="block text-xs font-medium text-muted-foreground">
            Etapa do funil
          </label>
          <select
            id="lead-stage"
            {...register('funnelStage')}
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="">—</option>
            <option value="VISITOR">Visitante</option>
            <option value="LEAD">Lead</option>
            <option value="MQL">MQL</option>
            <option value="SQL">SQL</option>
            <option value="CUSTOMER">Cliente</option>
          </select>
        </div>
        <div>
          <label htmlFor="lead-channel" className="block text-xs font-medium text-muted-foreground">
            Canal
          </label>
          <select
            id="lead-channel"
            {...register('channel')}
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="">—</option>
            <option value="ORGANIC">Orgânico</option>
            <option value="DIRECT">Direto</option>
            <option value="REFERRAL">Referral</option>
            <option value="SOCIAL">Social</option>
            <option value="EMAIL">E-mail</option>
            <option value="PAID">Pago</option>
            <option value="OTHER">Outro</option>
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="lead-notes" className="block text-xs font-medium text-muted-foreground">
          Notas
        </label>
        <textarea
          id="lead-notes"
          rows={4}
          {...register('notes')}
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={mutation.isPending}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          data-testid="lead-edit-save"
        >
          {mutation.isPending ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </form>
  )
}
