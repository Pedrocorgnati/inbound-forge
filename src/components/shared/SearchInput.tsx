'use client'

/**
 * TASK-11 ST005 (CL-TA-041, CL-CS-034): SearchInput generico com debounce e
 * sincronizacao com query string `?search=`.
 */
import { useEffect, useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'

export interface SearchInputProps {
  placeholder?: string
  debounceMs?: number
  paramKey?: string
  className?: string
  'data-testid'?: string
}

export function SearchInput({
  placeholder = 'Buscar...',
  debounceMs = 300,
  paramKey = 'search',
  className,
  'data-testid': dataTestId,
}: SearchInputProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [value, setValue] = useState<string>(searchParams.get(paramKey) ?? '')

  useEffect(() => {
    const handle = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString())
      if (value.trim().length >= 2) {
        params.set(paramKey, value.trim())
      } else {
        params.delete(paramKey)
      }
      params.delete('page')
      const qs = params.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    }, debounceMs)
    return () => clearTimeout(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, debounceMs, paramKey])

  return (
    <input
      type="search"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      placeholder={placeholder}
      data-testid={dataTestId}
      className={
        className ??
        'w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50'
      }
    />
  )
}
