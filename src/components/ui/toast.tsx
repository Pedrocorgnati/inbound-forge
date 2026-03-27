'use client'

import { Toaster as SonnerToaster } from 'sonner'

export { toast } from 'sonner'

export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        classNames: {
          toast: 'border border-border bg-background text-foreground shadow-lg',
          success: 'border-success-bg',
          error: 'border-danger-bg',
          warning: 'border-warning-bg',
          info: 'border-info-bg',
        },
        style: {
          fontFamily: 'var(--font-inter), sans-serif',
        },
      }}
      duration={4000}
    />
  )
}
