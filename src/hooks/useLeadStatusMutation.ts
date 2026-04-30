'use client'

// TASK-5 ST001 (CL-156): mutation reutilizavel para mover lead entre colunas
// do kanban. Aplica otimistic update e rollback em caso de erro. Usada pelo
// PipelineBoard.

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

export interface LeadStatusMutationInput {
  id: string
  status: string
  previousStatus?: string
}

interface LeadListItem {
  id: string
  status: string
  [key: string]: unknown
}

interface LeadsCache {
  data?: LeadListItem[]
  items?: LeadListItem[]
  [key: string]: unknown
}

const LEADS_KEY = ['leads'] as const

async function updateLeadStatus({ id, status }: LeadStatusMutationInput) {
  const res = await fetch(`/api/v1/leads/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error ?? `Falha ao atualizar lead (status ${res.status})`)
  }
  return res.json()
}

export function useLeadStatusMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateLeadStatus,
    onMutate: async (input: LeadStatusMutationInput) => {
      await queryClient.cancelQueries({ queryKey: LEADS_KEY })
      const previous = queryClient.getQueryData<LeadsCache>(LEADS_KEY)
      queryClient.setQueryData<LeadsCache | undefined>(LEADS_KEY, (old) => {
        if (!old) return old
        const list = old.items ?? old.data ?? []
        const next = list.map((lead) =>
          lead.id === input.id ? { ...lead, status: input.status } : lead
        )
        return { ...old, items: next, data: next }
      })
      return { previous }
    },
    onError: (err, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(LEADS_KEY, context.previous)
      }
      toast.error(err instanceof Error ? err.message : 'Erro ao mover lead')
    },
    onSuccess: () => {
      toast.success('Lead movido')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: LEADS_KEY })
    },
  })
}
