export type KeyCombo = `ctrl+${string}` | `shift+${string}` | `alt+${string}` | string

export interface KeyboardShortcut {
  description: string
  action: 'navigate' | 'confirm' | 'modal' | 'custom'
  target: string | null
  onTrigger?: () => void
}

export type ShortcutMap = Record<KeyCombo, KeyboardShortcut>
