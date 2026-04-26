/**
 * MvpCriteriaCard — Intake Review TASK-14 ST004 (CL-207).
 * Server component que exibe progresso "Posts MVP X/10".
 */
import { prisma } from '@/lib/prisma'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

const MVP_TARGET = 10

export async function MvpCriteriaCard() {
  let published = 0
  try {
    published = await prisma.contentPiece.count({ where: { status: 'PUBLISHED' } })
  } catch {
    published = 0
  }
  const clamped = Math.min(published, MVP_TARGET)
  const pct = Math.round((clamped / MVP_TARGET) * 100)
  const done = published >= MVP_TARGET

  return (
    <section
      aria-label="Criterio MVP"
      data-testid="mvp-criteria-card"
      className={cn(
        'mb-4 rounded-md border p-4',
        done ? 'border-success/40 bg-success/5' : 'border-border bg-surface',
      )}
    >
      <header className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Criterio MVP: 10+ posts publicados</h3>
        <span className={cn('text-sm font-bold', done && 'text-success')}>
          {done && <Check className="inline h-4 w-4" aria-hidden />} {published}/{MVP_TARGET}
        </span>
      </header>
      <div
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={MVP_TARGET}
        className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted"
      >
        <div
          className={cn('h-full transition-all', done ? 'bg-success' : 'bg-primary')}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {done
          ? 'Criterio MVP atingido — prossiga para escala.'
          : `Faltam ${MVP_TARGET - published} posts para cumprir o criterio MVP.`}
      </p>
    </section>
  )
}
