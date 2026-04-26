'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, FileText, Calendar, Activity, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BottomNavProps {
  locale: string
}

const ITEMS = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Início' },
  { href: '/content', icon: FileText, label: 'Conteúdo' },
  { href: '/fila', icon: Calendar, label: 'Fila' },
  { href: '/health', icon: Activity, label: 'Saúde' },
  { href: '/settings', icon: Settings, label: 'Config' },
]

export function BottomNav({ locale }: BottomNavProps) {
  const pathname = usePathname()

  return (
    <nav
      data-testid="bottom-nav"
      aria-label="Navegação inferior"
      className="fixed bottom-0 left-0 right-0 z-40 flex md:hidden border-t bg-background"
    >
      {ITEMS.map((item) => {
        const href = `/${locale}${item.href}`
        const active = pathname?.startsWith(href) ?? false
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px]',
              active ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            <Icon className="h-5 w-5" />
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
