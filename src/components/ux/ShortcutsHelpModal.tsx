'use client'

import * as React from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X, Keyboard } from 'lucide-react'
import { cn } from '@/lib/utils'
import { KEYBOARD_SHORTCUTS } from '@/constants/keyboard-shortcuts'
import type { KeyboardShortcut } from '@/types/keyboard'

interface ShortcutsHelpModalProps {
  open: boolean
  onClose: () => void
}

interface ShortcutSection {
  title: string
  filter: (action: KeyboardShortcut['action']) => boolean
}

const SECTIONS: ShortcutSection[] = [
  { title: 'Navegacao Global', filter: (a) => a === 'navigate' },
  { title: 'Conteudo', filter: (a) => a === 'confirm' || a === 'custom' },
  { title: 'Interface', filter: (a) => a === 'modal' },
]

function formatKeyCombo(combo: string): string[] {
  return combo.split('+').map((k) => {
    if (k === 'ctrl') return 'Ctrl'
    if (k === 'shift') return 'Shift'
    if (k === 'alt') return 'Alt'
    if (k === 'enter') return 'Enter'
    if (k === '?') return '?'
    return k.toUpperCase()
  })
}

export function ShortcutsHelpModal({ open, onClose }: ShortcutsHelpModalProps) {
  const entries = Object.entries(KEYBOARD_SHORTCUTS) as [string, KeyboardShortcut][]

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay
          data-testid="shortcuts-modal-overlay"
          className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
        />
        <Dialog.Content
          data-testid="shortcuts-modal"
          className={cn(
            'fixed left-1/2 top-1/2 z-50 w-[90vw] max-w-[520px] -translate-x-1/2 -translate-y-1/2',
            'rounded-lg border border-border bg-background p-6 shadow-lg',
            'duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
            'data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]',
            'data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]'
          )}
          aria-labelledby="shortcuts-modal-title"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Keyboard className="h-5 w-5 text-muted-foreground" aria-hidden />
              <Dialog.Title
                id="shortcuts-modal-title"
                className="text-lg font-semibold leading-none tracking-tight"
              >
                Atalhos de Teclado
              </Dialog.Title>
            </div>
            <Dialog.Close asChild>
              <button
                data-testid="shortcuts-modal-close"
                className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          <div className="mt-5 space-y-5">
            {SECTIONS.map((section) => {
              const sectionEntries = entries.filter(([, s]) => section.filter(s.action))
              if (sectionEntries.length === 0) return null

              return (
                <div key={section.title} data-testid={`shortcuts-section-${section.title.toLowerCase().replace(/\s+/g, '-')}`}>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {section.title}
                  </h3>
                  <ul className="space-y-1.5">
                    {sectionEntries.map(([combo, shortcut]) => (
                      <li
                        key={combo}
                        className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-muted/50"
                      >
                        <span className="text-foreground">{shortcut.description}</span>
                        <span className="flex items-center gap-1">
                          {formatKeyCombo(combo).map((key, i) => (
                            <React.Fragment key={`${combo}-${i}`}>
                              {i > 0 && <span className="text-muted-foreground">+</span>}
                              <kbd className="inline-flex h-6 min-w-[24px] items-center justify-center rounded border border-border bg-muted px-1.5 text-xs font-medium text-muted-foreground">
                                {key}
                              </kbd>
                            </React.Fragment>
                          ))}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>

          <div className="mt-5 border-t border-border pt-3">
            <p className="text-xs text-muted-foreground">
              Pressione <kbd className="mx-0.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded border border-border bg-muted px-1 text-[10px] font-medium">Esc</kbd> para fechar
            </p>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
