'use client'

import * as React from 'react'
import { Moon, Sun } from 'lucide-react'
import { Button } from './button'
import { useTheme } from '@/components/shared/ThemeProvider'

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()

  const toggle = React.useCallback(() => {
    setTheme(resolvedTheme === 'light' ? 'dark' : 'light')
  }, [resolvedTheme, setTheme])

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label={resolvedTheme === 'light' ? 'Ativar modo escuro' : 'Ativar modo claro'}
    >
      {resolvedTheme === 'light' ? (
        <Moon className="h-5 w-5" aria-hidden />
      ) : (
        <Sun className="h-5 w-5" aria-hidden />
      )}
    </Button>
  )
}
