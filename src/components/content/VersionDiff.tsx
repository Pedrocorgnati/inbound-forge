'use client'

// TASK-12 ST002 (CL-255): diff visual line-by-line entre duas versoes de texto.
// Algoritmo LCS simples (O(n*m)) suficiente para textos curtos de content piece.

import { useMemo } from 'react'

interface VersionDiffProps {
  before: string
  after: string
}

type LineOp = { kind: 'equal' | 'del' | 'add'; text: string }

function diffLines(a: string[], b: string[]): LineOp[] {
  const n = a.length
  const m = b.length
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      if (a[i] === b[j]) dp[i][j] = dp[i + 1][j + 1] + 1
      else dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }
  const out: LineOp[] = []
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      out.push({ kind: 'equal', text: a[i] })
      i++
      j++
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      out.push({ kind: 'del', text: a[i++] })
    } else {
      out.push({ kind: 'add', text: b[j++] })
    }
  }
  while (i < n) out.push({ kind: 'del', text: a[i++] })
  while (j < m) out.push({ kind: 'add', text: b[j++] })
  return out
}

export function VersionDiff({ before, after }: VersionDiffProps) {
  const ops = useMemo(() => diffLines(before.split('\n'), after.split('\n')), [before, after])

  return (
    <pre
      data-testid="version-diff"
      className="max-h-[60vh] overflow-auto rounded-md border border-border bg-card p-3 text-xs font-mono"
    >
      {ops.map((op, i) => (
        <div
          key={i}
          className={
            op.kind === 'add'
              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
              : op.kind === 'del'
                ? 'bg-destructive/10 text-destructive line-through'
                : 'text-muted-foreground'
          }
        >
          <span className="select-none pr-2 opacity-60">
            {op.kind === 'add' ? '+' : op.kind === 'del' ? '-' : ' '}
          </span>
          {op.text || '\u00A0'}
        </div>
      ))}
    </pre>
  )
}
