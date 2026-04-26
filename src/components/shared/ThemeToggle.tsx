'use client'

import { Sun, Moon, Monitor } from 'lucide-react'
import { useTheme } from './ThemeProvider'
import { cn } from '@/lib/utils'

interface ThemeToggleProps {
  className?: string
  'data-testid'?: string
}

export function ThemeToggle({ className, 'data-testid': testId = 'theme-toggle' }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme()

  const options = [
    { value: 'light' as const, icon: <Sun className="h-4 w-4" />, label: 'Claro' },
    { value: 'dark' as const, icon: <Moon className="h-4 w-4" />, label: 'Escuro' },
    { value: 'system' as const, icon: <Monitor className="h-4 w-4" />, label: 'Sistema' },
  ]

  return (
    <div
      data-testid={testId}
      role="radiogroup"
      aria-label="Tema da interface"
      className={cn('inline-flex rounded-md border border-border bg-muted p-0.5 gap-0.5', className)}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={theme === opt.value}
          aria-label={opt.label}
          onClick={() => setTheme(opt.value)}
          className={cn(
            'flex items-center justify-center h-7 w-7 rounded transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
            theme === opt.value
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {opt.icon}
        </button>
      ))}
    </div>
  )
}
