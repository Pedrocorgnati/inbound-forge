'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils'

interface VersionDiffProps {
  oldText: string
  newText: string
  className?: string
}

interface DiffLine {
  type: 'added' | 'removed' | 'unchanged'
  text: string
}

function computeDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split('\n')
  const newLines = newText.split('\n')
  const result: DiffLine[] = []

  const maxLen = Math.max(oldLines.length, newLines.length)
  let oi = 0
  let ni = 0

  while (oi < oldLines.length || ni < newLines.length) {
    if (oi >= oldLines.length) {
      result.push({ type: 'added', text: newLines[ni] })
      ni++
    } else if (ni >= newLines.length) {
      result.push({ type: 'removed', text: oldLines[oi] })
      oi++
    } else if (oldLines[oi] === newLines[ni]) {
      result.push({ type: 'unchanged', text: oldLines[oi] })
      oi++
      ni++
    } else {
      // Simple heuristic: look ahead to find matching lines
      let foundInNew = false
      for (let j = ni + 1; j < Math.min(ni + 5, newLines.length); j++) {
        if (oldLines[oi] === newLines[j]) {
          // Lines ni..j-1 are additions
          for (let k = ni; k < j; k++) {
            result.push({ type: 'added', text: newLines[k] })
          }
          ni = j
          foundInNew = true
          break
        }
      }
      if (!foundInNew) {
        result.push({ type: 'removed', text: oldLines[oi] })
        oi++
        if (ni < newLines.length && oi <= maxLen) {
          result.push({ type: 'added', text: newLines[ni] })
          ni++
        }
      }
    }
  }

  return result
}

export function VersionDiff({ oldText, newText, className }: VersionDiffProps) {
  const diff = useMemo(() => computeDiff(oldText, newText), [oldText, newText])

  if (oldText === newText) {
    return (
      <p className="text-sm text-muted-foreground italic">Sem diferenças</p>
    )
  }

  return (
    <div
      className={cn('rounded-md border border-border overflow-hidden', className)}
      data-testid="version-diff"
    >
      <pre className="text-xs font-mono p-3 overflow-x-auto">
        {diff.map((line, i) => (
          <div
            key={i}
            className={cn(
              'px-2 py-0.5',
              line.type === 'added' && 'bg-[#D1FAE5] text-[#065F46]',
              line.type === 'removed' && 'bg-[#FEE2E2] text-[#991B1B]'
            )}
          >
            <span className="select-none mr-2 text-muted-foreground">
              {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
            </span>
            {line.text}
          </div>
        ))}
      </pre>
    </div>
  )
}
