'use client'

import { useState, useCallback, useMemo } from 'react'
import { BUSINESS_RULES } from '@/types/constants'

interface UsePaginationOptions {
  initialPage?: number
  initialPageSize?: number
  total?: number
}

export function usePagination(options: UsePaginationOptions = {}) {
  const {
    initialPage = 1,
    initialPageSize = BUSINESS_RULES.DEFAULT_PAGE_SIZE,
    total: initialTotal = 0,
  } = options

  const [page, setPage] = useState(initialPage)
  const [pageSize, setPageSize] = useState(initialPageSize)
  const [total, setTotal] = useState(initialTotal)

  const totalPages = useMemo(() => Math.ceil(total / pageSize) || 1, [total, pageSize])
  const hasNext = page < totalPages
  const hasPrev = page > 1

  const goToPage = useCallback((p: number) => {
    setPage(Math.max(1, Math.min(p, totalPages)))
  }, [totalPages])

  const nextPage = useCallback(() => {
    if (hasNext) setPage((p) => p + 1)
  }, [hasNext])

  const prevPage = useCallback(() => {
    if (hasPrev) setPage((p) => p - 1)
  }, [hasPrev])

  const reset = useCallback(() => {
    setPage(initialPage)
    setPageSize(initialPageSize)
  }, [initialPage, initialPageSize])

  return {
    page, pageSize, total, totalPages, hasNext, hasPrev,
    setPage: goToPage, setPageSize, setTotal,
    nextPage, prevPage, reset,
  }
}
