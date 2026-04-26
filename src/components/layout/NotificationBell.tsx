'use client'

/**
 * NotificationBell — Intake Review TASK-11 ST004 (CL-245/246).
 * Sino no header com badge + popover via NotificationPanel.
 */
import { useEffect, useState } from 'react'
import { Bell } from 'lucide-react'
import { cn } from '@/lib/utils'
import { NotificationPanel } from './NotificationPanel'

interface NotificationPayload {
  id: string
  type: string
  title: string
  body?: string | null
  link?: string | null
  readAt?: string | null
  createdAt: string
}

interface ListResponse {
  success: boolean
  data?: {
    notifications: NotificationPayload[]
    unreadCount: number
  }
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [unread, setUnread] = useState(0)
  const [items, setItems] = useState<NotificationPayload[]>([])
  const [loading, setLoading] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/v1/notifications', { credentials: 'include' })
      const payload: ListResponse = await res.json()
      if (payload.success && payload.data) {
        setItems(payload.data.notifications)
        setUnread(payload.data.unreadCount)
      }
    } catch (err) {
      console.error('[NotificationBell.load]', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    const interval = setInterval(load, 30_000)
    return () => clearInterval(interval)
  }, [])

  async function markRead(id: string) {
    try {
      await fetch(`/api/v1/notifications/${id}/read`, {
        method: 'PATCH',
        credentials: 'include',
      })
      setItems((prev) =>
        prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)),
      )
      setUnread((u) => Math.max(0, u - 1))
    } catch (err) {
      console.error('[NotificationBell.markRead]', err)
    }
  }

  async function markAllRead() {
    try {
      await fetch('/api/v1/notifications', {
        method: 'POST',
        credentials: 'include',
      })
      await load()
    } catch (err) {
      console.error('[NotificationBell.markAllRead]', err)
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Notificacoes${unread > 0 ? ` (${unread} nao lidas)` : ''}`}
        aria-expanded={open}
        data-testid="notification-bell"
        className={cn(
          'relative flex h-9 w-9 items-center justify-center rounded-md hover:bg-muted transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        )}
      >
        <Bell className="h-4 w-4 text-muted-foreground" />
        {unread > 0 && (
          <span
            data-testid="notification-bell-badge"
            className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground"
          >
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>
      {open && (
        <NotificationPanel
          items={items}
          loading={loading}
          onClose={() => setOpen(false)}
          onMarkRead={markRead}
          onMarkAllRead={markAllRead}
        />
      )}
    </div>
  )
}
