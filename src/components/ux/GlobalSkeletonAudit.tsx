'use client'

import { useState } from 'react'
import { CheckCircle2, XCircle, ChevronUp, ChevronDown } from 'lucide-react'

/**
 * Dev-only overlay that audits which components have skeleton loaders.
 * Only renders in development mode.
 */

interface SkeletonCheck {
  component: string
  path: string
  hasSkeleton: boolean
}

const SKELETON_CHECKLIST: SkeletonCheck[] = [
  { component: 'DashboardContent', path: 'components/dashboard/DashboardContent', hasSkeleton: true },
  { component: 'BentoGrid (dashboard)', path: 'components/dashboard/BentoGrid', hasSkeleton: true },
  { component: 'KnowledgeTabs', path: 'components/knowledge/knowledge-tabs', hasSkeleton: false },
  { component: 'CaseList', path: 'components/knowledge/CaseList', hasSkeleton: false },
  { component: 'PainList', path: 'components/knowledge/PainList', hasSkeleton: false },
  { component: 'PatternList', path: 'components/knowledge/PatternList', hasSkeleton: false },
  { component: 'ObjectionList', path: 'components/knowledge/ObjectionList', hasSkeleton: false },
  { component: 'UTMLinkGenerator', path: 'components/utm/UTMLinkGenerator', hasSkeleton: false },
  { component: 'ProgressGateWrapper', path: 'components/knowledge/ProgressGateWrapper', hasSkeleton: false },
  { component: 'ThemeCard', path: 'components/dashboard/ThemeCard', hasSkeleton: false },
  { component: 'Sidebar', path: 'components/layout/sidebar', hasSkeleton: false },
]

export function GlobalSkeletonAudit() {
  const [expanded, setExpanded] = useState(false)

  if (process.env.NODE_ENV !== 'development') return null

  const total = SKELETON_CHECKLIST.length
  const covered = SKELETON_CHECKLIST.filter((c) => c.hasSkeleton).length

  return (
    <div
      data-testid="skeleton-audit"
      className="fixed bottom-4 right-4 z-50 w-72 rounded-lg border border-border bg-background shadow-xl"
    >
      <button
        data-testid="skeleton-audit-toggle"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted/50"
      >
        <span>
          Skeleton Audit: {covered}/{total}
        </span>
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5" />
        ) : (
          <ChevronUp className="h-3.5 w-3.5" />
        )}
      </button>

      {expanded && (
        <ul data-testid="skeleton-audit-list" className="max-h-64 overflow-y-auto border-t border-border px-3 py-2 space-y-1">
          {SKELETON_CHECKLIST.map((check) => (
            <li
              key={check.component}
              className="flex items-center gap-2 text-xs"
            >
              {check.hasSkeleton ? (
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-500" aria-label="Tem skeleton" />
              ) : (
                <XCircle className="h-3.5 w-3.5 shrink-0 text-red-500" aria-label="Sem skeleton" />
              )}
              <span className="truncate text-muted-foreground" title={check.path}>
                {check.component}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
