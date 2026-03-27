import type { ShortcutMap } from '@/types/keyboard'

export const KEYBOARD_SHORTCUTS = {
  'ctrl+1': { description: 'Ir para Dashboard',    action: 'navigate', target: '/dashboard' },
  'ctrl+2': { description: 'Ir para Calendário',   action: 'navigate', target: '/calendar'  },
  'ctrl+3': { description: 'Ir para Analytics',    action: 'navigate', target: '/analytics' },
  'enter':  { description: 'Confirmar ação',        action: 'confirm',  target: null          },
  '?':      { description: 'Mostrar atalhos',       action: 'modal',    target: 'shortcuts'   },
} as const satisfies ShortcutMap

// Tipo derivado — garante que o consumer não usa string arbitrária
export type ShortcutKey = keyof typeof KEYBOARD_SHORTCUTS
// Resultado: 'ctrl+1' | 'ctrl+2' | 'ctrl+3' | 'enter' | '?'
