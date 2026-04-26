'use client'

// VersionDiffViewer — diff word-level side-by-side / inline entre duas versoes.
// Intake-Review TASK-16 ST001 (CL-CS-036). Biblioteca `diff` (jsdiff).

import { diffWordsWithSpace, type Change } from 'diff'
import { useMemo } from 'react'

type Version = {
  id: string
  version?: number | null
  body?: string | null
  author?: string | null
  createdAt?: string | Date | null
  generationVersion?: number | null
}

type Props = {
  versionA: Version
  versionB: Version
  mode?: 'inline' | 'split'
  className?: string
}

export function VersionDiffViewer({ versionA, versionB, mode = 'inline', className }: Props) {
  const changes = useMemo<Change[]>(() => {
    return diffWordsWithSpace(versionA.body ?? '', versionB.body ?? '')
  }, [versionA.body, versionB.body])

  return (
    <section className={className} data-testid="version-diff-viewer">
      <header className="grid grid-cols-1 gap-2 border-b pb-3 text-xs sm:grid-cols-2">
        <VersionMeta label="Versao A" v={versionA} />
        <VersionMeta label="Versao B" v={versionB} />
      </header>

      {mode === 'inline' ? (
        <pre
          data-testid="diff-inline"
          className="mt-4 whitespace-pre-wrap break-words rounded border border-border bg-card p-3 font-mono text-sm leading-relaxed"
        >
          {changes.map((part, i) => {
            const cls = part.added
              ? 'bg-emerald-500/20 text-emerald-100'
              : part.removed
                ? 'bg-rose-500/20 text-rose-200 line-through'
                : ''
            return (
              <span key={i} className={cls}>
                {part.value}
              </span>
            )
          })}
        </pre>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <pre
            data-testid="diff-split-a"
            className="whitespace-pre-wrap break-words rounded border border-border bg-card p-3 font-mono text-sm leading-relaxed"
          >
            {changes.map((part, i) => {
              if (part.added) return null
              return (
                <span key={i} className={part.removed ? 'bg-rose-500/20 text-rose-200' : ''}>
                  {part.value}
                </span>
              )
            })}
          </pre>
          <pre
            data-testid="diff-split-b"
            className="whitespace-pre-wrap break-words rounded border border-border bg-card p-3 font-mono text-sm leading-relaxed"
          >
            {changes.map((part, i) => {
              if (part.removed) return null
              return (
                <span key={i} className={part.added ? 'bg-emerald-500/20 text-emerald-100' : ''}>
                  {part.value}
                </span>
              )
            })}
          </pre>
        </div>
      )}
    </section>
  )
}

function VersionMeta({ label, v }: { label: string; v: Version }) {
  return (
    <div className="space-y-0.5">
      <p className="font-semibold">{label}</p>
      <p className="text-muted-foreground">
        v{v.version ?? '?'}
        {v.generationVersion != null ? ` · gen${v.generationVersion}` : ''}
        {v.author ? ` · ${v.author}` : ''}
      </p>
      {v.createdAt && (
        <p className="text-muted-foreground">{new Date(v.createdAt).toLocaleString()}</p>
      )}
    </div>
  )
}
