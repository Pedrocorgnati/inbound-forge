'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight } from 'lucide-react'

interface BreadcrumbsProps {
  locale: string
}

const LABEL_MAP: Record<string, string> = {
  dashboard: 'Dashboard',
  content: 'Conteúdo',
  fila: 'Fila',
  analytics: 'Analytics',
  leads: 'Leads',
  health: 'Saúde',
  settings: 'Configurações',
  profile: 'Perfil',
  api: 'Credenciais',
  schedule: 'Agenda',
  preferences: 'Preferências',
  costs: 'Custos',
}

export function Breadcrumbs({ locale }: BreadcrumbsProps) {
  const pathname = usePathname()
  if (!pathname) return null

  const parts = pathname
    .replace(new RegExp(`^/${locale}`), '')
    .split('/')
    .filter(Boolean)

  if (parts.length <= 1) return null

  return (
    <nav
      data-testid="breadcrumbs"
      aria-label="Trilha de navegação"
      className="flex items-center gap-1 text-xs text-muted-foreground mb-4"
    >
      {parts.map((part, i) => {
        const href = `/${locale}/${parts.slice(0, i + 1).join('/')}`
        const isLast = i === parts.length - 1
        const label = LABEL_MAP[part] ?? part
        return (
          <span key={href} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="h-3 w-3" />}
            {isLast ? (
              <span className="text-foreground font-medium">{label}</span>
            ) : (
              <Link href={href} className="hover:text-foreground">
                {label}
              </Link>
            )}
          </span>
        )
      })}
    </nav>
  )
}
