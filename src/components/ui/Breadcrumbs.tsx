'use client'

// Breadcrumbs — navegacao hierarquica baseada em pathname (TASK-10 ST002 / CL-198)

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { resolveBreadcrumbs, type ResolvedBreadcrumb } from '@/lib/navigation/breadcrumb-registry'

interface BreadcrumbsProps {
  className?: string
  // Forca renderizacao mesmo na home (padrao: oculta quando cadeia vazia)
  alwaysShow?: boolean
}

function useBreadcrumbChain(pathname: string): {
  chain: ResolvedBreadcrumb[]
  dynamicLabels: Record<string, string | null>
} {
  const chain = React.useMemo(() => resolveBreadcrumbs(pathname), [pathname])
  const [dynamicLabels, setDynamicLabels] = React.useState<Record<string, string | null>>({})

  React.useEffect(() => {
    let cancelled = false
    async function loadDynamic() {
      for (const item of chain) {
        if (item.dynamicResolver && item.params) {
          const label = await item.dynamicResolver(item.params)
          if (cancelled) return
          setDynamicLabels((prev) => ({ ...prev, [item.href]: label }))
        }
      }
    }
    void loadDynamic()
    return () => {
      cancelled = true
    }
  }, [chain])

  return { chain, dynamicLabels }
}

export function Breadcrumbs({ className, alwaysShow = false }: BreadcrumbsProps) {
  const pathname = usePathname() ?? ''
  const { chain, dynamicLabels } = useBreadcrumbChain(pathname)
  const t = useTranslations()

  if (chain.length === 0 && !alwaysShow) return null

  // Mobile: se cadeia > 3, mostra primeiro + "..." + ultimos 2
  const collapsed = chain.length > 3

  const renderItem = (item: ResolvedBreadcrumb, idx: number, isLast: boolean) => {
    const dyn = dynamicLabels[item.href]
    const label = dyn ?? (t(item.labelKey as never) || item.labelKey)
    const isLoading = item.dynamicResolver && dyn === undefined
    return (
      <li
        key={item.href + idx}
        className="inline-flex items-center gap-1.5"
        {...(isLast ? { 'aria-current': 'page' } : {})}
      >
        {isLast ? (
          <span className="text-sm font-medium text-foreground">
            {isLoading ? <span className="inline-block h-4 w-16 animate-pulse rounded bg-muted" /> : label}
          </span>
        ) : (
          <Link
            href={item.href}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {isLoading ? <span className="inline-block h-4 w-16 animate-pulse rounded bg-muted" /> : label}
          </Link>
        )}
        {!isLast && (
          <span aria-hidden="true" className="text-muted-foreground/50">
            /
          </span>
        )}
      </li>
    )
  }

  return (
    <nav
      role="navigation"
      aria-label="Breadcrumb"
      className={['flex w-full overflow-hidden px-4 py-2 text-sm', className].filter(Boolean).join(' ')}
      data-testid="breadcrumbs"
    >
      {/* Mobile collapsed */}
      <ol className="flex flex-wrap items-center gap-1.5 md:hidden">
        {collapsed ? (
          <>
            {renderItem(chain[0], 0, false)}
            <li aria-hidden="true" className="text-muted-foreground/60">
              …
            </li>
            <span aria-hidden="true" className="text-muted-foreground/50">
              /
            </span>
            {chain.slice(-2).map((item, idx) => renderItem(item, idx, idx === 1))}
          </>
        ) : (
          chain.map((item, idx) => renderItem(item, idx, idx === chain.length - 1))
        )}
      </ol>

      {/* Desktop full */}
      <ol className="hidden flex-wrap items-center gap-1.5 md:flex">
        {chain.map((item, idx) => renderItem(item, idx, idx === chain.length - 1))}
      </ol>
    </nav>
  )
}
