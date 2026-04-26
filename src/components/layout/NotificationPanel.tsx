'use client'

/**
 * NotificationPanel — Intake Review TASK-11 ST004 (CL-245).
 * Popover simples que lista ate 20 notificacoes, agrupadas por tipo.
 */
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface NotificationPayload {
  id: string
  type: string
  title: string
  body?: string | null
  link?: string | null
  readAt?: string | null
  createdAt: string
}

interface Props {
  items: NotificationPayload[]
  loading: boolean
  onClose: () => void
  onMarkRead: (id: string) => void | Promise<void>
  onMarkAllRead: () => void | Promise<void>
}

function groupByType(items: NotificationPayload[]): Record<string, NotificationPayload[]> {
  return items.reduce<Record<string, NotificationPayload[]>>((acc, item) => {
    ;(acc[item.type] ||= []).push(item)
    return acc
  }, {})
}

export function NotificationPanel({ items, loading, onClose, onMarkRead, onMarkAllRead }: Props) {
  const grouped = groupByType(items)
  const types = Object.keys(grouped)

  return (
    <div
      role="dialog"
      aria-label="Centro de notificacoes"
      data-testid="notification-panel"
      className="absolute right-0 top-full z-50 mt-2 w-[360px] max-h-[480px] overflow-auto rounded-md border border-border bg-surface shadow-lg"
    >
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <h3 className="text-sm font-semibold">Notificacoes</h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onMarkAllRead()}
            className="text-xs text-primary hover:underline"
          >
            Marcar todas lidas
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="text-xs text-muted-foreground hover:underline"
          >
            Fechar
          </button>
        </div>
      </div>

      {loading && items.length === 0 && (
        <p className="px-3 py-4 text-sm text-muted-foreground">Carregando...</p>
      )}
      {!loading && items.length === 0 && (
        <p className="px-3 py-6 text-center text-sm text-muted-foreground">
          Nenhuma notificacao.
        </p>
      )}

      {types.map((type) => (
        <section key={type} aria-label={`Grupo ${type}`} className="border-b border-border last:border-b-0">
          <h4 className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {type.replace(/_/g, ' ')}
          </h4>
          <ul role="list">
            {grouped[type].map((n) => {
              const unread = !n.readAt
              const content = (
                <div className="flex-1">
                  <p className={cn('text-sm', unread && 'font-semibold')}>{n.title}</p>
                  {n.body && (
                    <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{n.body}</p>
                  )}
                  <time className="mt-1 block text-[10px] text-muted-foreground">
                    {new Date(n.createdAt).toLocaleString()}
                  </time>
                </div>
              )
              return (
                <li
                  key={n.id}
                  className={cn(
                    'flex gap-2 px-3 py-2 hover:bg-muted/40 transition-colors',
                    unread && 'bg-primary/5',
                  )}
                >
                  {unread && (
                    <span
                      aria-hidden
                      className="mt-1.5 h-2 w-2 flex-none rounded-full bg-primary"
                    />
                  )}
                  {n.link ? (
                    <Link
                      href={n.link}
                      onClick={() => {
                        if (unread) void onMarkRead(n.id)
                        onClose()
                      }}
                      className="flex-1"
                    >
                      {content}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => unread && void onMarkRead(n.id)}
                      className="flex-1 text-left"
                    >
                      {content}
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}
