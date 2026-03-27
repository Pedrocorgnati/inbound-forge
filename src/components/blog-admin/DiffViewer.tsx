'use client'

import * as React from 'react'
import { diffWords } from 'diff'
import { cn } from '@/lib/utils'

interface DiffViewerProps {
  before: string
  after: string
}

interface DiffToken {
  value: string
  added?: boolean
  removed?: boolean
}

function DiffPanel({
  tokens,
  label,
  side,
}: {
  tokens: DiffToken[]
  label: string
  side: 'before' | 'after'
}) {
  return (
    <div className="flex-1 min-w-0">
      <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <div className="rounded-md border border-border bg-muted/30 p-3 text-sm leading-relaxed whitespace-pre-wrap break-words max-h-[400px] overflow-y-auto">
        {tokens.map((part, i) => {
          if (side === 'before') {
            if (part.added) return null
            if (part.removed) {
              return (
                <span
                  key={i}
                  className="bg-[#FEE2E2] line-through text-foreground"
                >
                  {part.value}
                </span>
              )
            }
            return <span key={i}>{part.value}</span>
          }

          // side === 'after'
          if (part.removed) return null
          if (part.added) {
            return (
              <span key={i} className="bg-[#DCFCE7] text-foreground">
                {part.value}
              </span>
            )
          }
          return <span key={i}>{part.value}</span>
        })}
      </div>
    </div>
  )
}

export function DiffViewer({ before, after }: DiffViewerProps) {
  const tokens = React.useMemo(() => diffWords(before, after), [before, after])

  if (before === after) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhuma diferenca encontrada.
      </p>
    )
  }

  return (
    <div className={cn('flex flex-col gap-4 md:flex-row md:gap-6')}>
      <DiffPanel tokens={tokens} label="Anterior" side="before" />
      <DiffPanel tokens={tokens} label="Atual" side="after" />
    </div>
  )
}
