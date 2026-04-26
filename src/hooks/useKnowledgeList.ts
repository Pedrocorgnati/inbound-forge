'use client'

import { useCallback, useEffect, useState } from 'react'
import type { PaginationData } from '@/lib/types/pagination'

const DEFAULT_PAGE_SIZE = 20

interface UseKnowledgeListOptions {
  /** Endpoint base, ex: `/api/knowledge/pains` */
  endpoint: string
  pageSize?: number
  /** Params adicionais de filtro (ex: `{ sector: 'operational_time' }`) */
  filters?: Record<string, string>
}

interface UseKnowledgeListReturn<T> {
  items: T[]
  pagination: PaginationData | null
  page: number
  isLoading: boolean
  error: string | null
  deleteTarget: T | null
  isDeleting: boolean
  setPage: (page: number) => void
  setItems: React.Dispatch<React.SetStateAction<T[]>>
  setDeleteTarget: (item: T | null) => void
  refresh: () => void
  handleDelete: (options: {
    itemId: string
    getLabel: (item: T) => string
    successMessage: (label: string) => string
    errorMessage: string
  }) => Promise<void>
}

/**
 * Abstrai o padrão de lista CRUD compartilhado pelos componentes de Knowledge
 * (PainList, CaseList, PatternList, ObjectionList).
 *
 * Elimina ~60 linhas de estado e lógica duplicados por componente.
 */
export function useKnowledgeList<T extends { id: string }>({
  endpoint,
  pageSize = DEFAULT_PAGE_SIZE,
  filters = {},
}: UseKnowledgeListOptions): UseKnowledgeListReturn<T> {
  const [items, setItems] = useState<T[]>([])
  const [pagination, setPagination] = useState<PaginationData | null>(null)
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<T | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const filterString = JSON.stringify(filters)

  const fetchItems = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    const params = new URLSearchParams({
      page: String(page),
      limit: String(pageSize),
    })

    const parsedFilters = JSON.parse(filterString) as Record<string, string>
    Object.entries(parsedFilters).forEach(([key, value]) => {
      if (value) params.set(key, value)
    })

    try {
      const res = await fetch(`${endpoint}?${params}`)
      if (!res.ok) throw new Error('Falha ao carregar')

      const json = await res.json()
      setItems(json.data ?? [])
      setPagination(json.pagination ?? null)
    } catch {
      setError('Não foi possível carregar os dados. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }, [endpoint, page, pageSize, filterString])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  const handleDelete = useCallback(
    async ({
      itemId,
      getLabel,
      successMessage,
      errorMessage,
    }: {
      itemId: string
      getLabel: (item: T) => string
      successMessage: (label: string) => string
      errorMessage: string
    }) => {
      const target = items.find((i) => i.id === itemId)
      if (!target) return

      const previousItems = [...items]
      const label = getLabel(target)

      // Optimistic removal
      setItems((prev) => prev.filter((i) => i.id !== itemId))
      setDeleteTarget(null)
      setIsDeleting(true)

      try {
        const res = await fetch(`${endpoint}/${itemId}`, { method: 'DELETE' })
        if (!res.ok) throw new Error('Falha ao deletar')

        // Dynamic import to avoid bundling toast in SSR
        const { toast } = await import('@/components/ui/toast')
        toast.success(successMessage(label))

        if (pagination) {
          setPagination((prev) =>
            prev ? { ...prev, total: prev.total - 1 } : prev
          )
        }
      } catch {
        // Rollback
        setItems(previousItems)
        const { toast } = await import('@/components/ui/toast')
        toast.error(errorMessage)
      } finally {
        setIsDeleting(false)
      }
    },
    [items, endpoint, pagination]
  )

  return {
    items,
    pagination,
    page,
    isLoading,
    error,
    deleteTarget,
    isDeleting,
    setPage,
    setItems,
    setDeleteTarget,
    refresh: fetchItems,
    handleDelete,
  }
}
