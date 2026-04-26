'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'

interface CommandPaletteProps {
  locale: string
}

interface CommandItem {
  label: string
  href: string
  keywords: string[]
}

const COMMANDS: CommandItem[] = [
  { label: 'Dashboard', href: '/dashboard', keywords: ['home', 'inicio'] },
  { label: 'Conteúdo', href: '/content', keywords: ['posts', 'artigos'] },
  { label: 'Fila', href: '/fila', keywords: ['queue', 'calendario'] },
  { label: 'Analytics', href: '/analytics', keywords: ['metricas'] },
  { label: 'Leads', href: '/leads', keywords: ['clientes'] },
  { label: 'Health', href: '/health', keywords: ['workers', 'saude'] },
  { label: 'Configurações', href: '/settings', keywords: ['settings', 'config'] },
  { label: 'Perfil', href: '/profile', keywords: ['usuario', 'conta'] },
]

export function CommandPalette({ locale }: CommandPaletteProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const results = COMMANDS.filter((c) => {
    if (!query) return true
    const q = query.toLowerCase()
    return c.label.toLowerCase().includes(q) || c.keywords.some((k) => k.includes(q))
  })

  return (
    <Modal open={open} onClose={() => setOpen(false)} title="Buscar" size="md">
      <div className="space-y-3">
        <div className="flex items-center gap-2 border rounded-md px-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            autoFocus
            placeholder="Digite uma rota ou comando..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="border-0 focus-visible:ring-0"
          />
        </div>
        <ul className="max-h-64 overflow-y-auto">
          {results.map((r) => (
            <li key={r.href}>
              <button
                type="button"
                onClick={() => {
                  router.push(`/${locale}${r.href}`)
                  setOpen(false)
                }}
                className="w-full text-left px-3 py-2 rounded hover:bg-muted text-sm"
              >
                {r.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </Modal>
  )
}
