'use client'

import { useCallback, useMemo } from 'react'
import { useAutosave } from './useAutosave'

const AUTOSAVE_DELAY = 2000

interface UseKnowledgeAutosaveOptions<T> {
  form: T
  /** URL completa do endpoint PATCH, ex: `/api/knowledge/pains/${id}` */
  endpoint: string
  /** Transforma o estado do form no payload enviado ao PATCH */
  getPayload: (data: T) => Record<string, unknown>
  entityId: string | undefined
  mode: 'create' | 'edit'
  /** Quando `false`, desabilita o autosave (ex: modal fechado). Default: `true`. */
  isOpen?: boolean
}

interface UseKnowledgeAutosaveReturn {
  autosaveStatus: 'idle' | 'saving' | 'saved' | 'error'
  lastSaved: Date | null
  triggerSave: () => void
}

/**
 * Abstrai o padrão de autosave compartilhado pelos forms de Knowledge
 * (PainForm, ObjectionForm, PatternForm, CaseForm).
 *
 * Elimina ~22 linhas de código duplicado por form.
 */
export function useKnowledgeAutosave<T>({
  form,
  endpoint,
  getPayload,
  entityId,
  mode,
  isOpen = true,
}: UseKnowledgeAutosaveOptions<T>): UseKnowledgeAutosaveReturn {
  const formSerialized = useMemo(() => JSON.stringify(form), [form])

  const saveFn = useCallback(
    async (data: T) => {
      if (!entityId) return
      const res = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(getPayload(data)),
      })
      if (!res.ok) throw new Error('Falha ao salvar')
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entityId, endpoint]
  )

  const { status: autosaveStatus, lastSaved, triggerSave } = useAutosave(
    formSerialized,
    async () => saveFn(form),
    AUTOSAVE_DELAY,
    mode === 'edit' && !!entityId && isOpen
  )

  return { autosaveStatus, lastSaved, triggerSave }
}
