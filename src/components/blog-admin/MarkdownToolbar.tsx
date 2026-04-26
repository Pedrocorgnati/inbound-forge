'use client'

// MarkdownToolbar — botoes + atalhos para insercao de sintaxe markdown (TASK-9 ST001 / CL-239)
// Acessibilidade: role="toolbar", aria-label por botao, atalhos documentados.

import { type RefObject, useCallback, useEffect } from 'react'

type Props = {
  textareaRef: RefObject<HTMLTextAreaElement | null>
  value: string
  onChange: (next: string) => void
  onInsertImage?: () => void
}

type Action =
  | { kind: 'wrap'; before: string; after: string; label: string; shortcut?: string }
  | { kind: 'line'; prefix: string; label: string }
  | { kind: 'block'; text: string; label: string }
  | { kind: 'custom'; label: string; run: () => void }

const actions: Action[] = [
  { kind: 'wrap', before: '**', after: '**', label: 'Bold', shortcut: 'Ctrl+B' },
  { kind: 'wrap', before: '_', after: '_', label: 'Italic', shortcut: 'Ctrl+I' },
  { kind: 'line', prefix: '## ', label: 'H2' },
  { kind: 'line', prefix: '### ', label: 'H3' },
  { kind: 'wrap', before: '[', after: '](url)', label: 'Link', shortcut: 'Ctrl+K' },
  { kind: 'wrap', before: '`', after: '`', label: 'Code inline' },
  { kind: 'block', text: '\n```\ncode\n```\n', label: 'Code block' },
  { kind: 'line', prefix: '- ', label: 'UL' },
  { kind: 'line', prefix: '1. ', label: 'OL' },
  { kind: 'line', prefix: '> ', label: 'Quote' },
  {
    kind: 'block',
    text: '\n| Col1 | Col2 |\n|------|------|\n| v1   | v2   |\n',
    label: 'Table',
  },
  { kind: 'wrap', before: '_— ', after: '_', label: 'Citation' },
]

export function MarkdownToolbar({ textareaRef, value, onChange, onInsertImage }: Props) {
  const apply = useCallback(
    (action: Action) => {
      const ta = textareaRef.current
      if (!ta) return
      const start = ta.selectionStart
      const end = ta.selectionEnd
      const selected = value.slice(start, end)

      let nextValue = value
      let caretStart = start
      let caretEnd = end

      if (action.kind === 'wrap') {
        nextValue = value.slice(0, start) + action.before + selected + action.after + value.slice(end)
        caretStart = start + action.before.length
        caretEnd = caretStart + selected.length
      } else if (action.kind === 'line') {
        const lineStart = value.lastIndexOf('\n', start - 1) + 1
        nextValue = value.slice(0, lineStart) + action.prefix + value.slice(lineStart)
        caretStart = start + action.prefix.length
        caretEnd = end + action.prefix.length
      } else if (action.kind === 'block') {
        nextValue = value.slice(0, start) + action.text + value.slice(end)
        caretStart = start + action.text.length
        caretEnd = caretStart
      } else if (action.kind === 'custom') {
        action.run()
        return
      }

      onChange(nextValue)
      requestAnimationFrame(() => {
        if (!textareaRef.current) return
        textareaRef.current.focus()
        textareaRef.current.setSelectionRange(caretStart, caretEnd)
      })
    },
    [onChange, textareaRef, value],
  )

  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return

    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return
      const k = e.key.toLowerCase()
      if (k === 'b') {
        e.preventDefault()
        apply(actions[0])
      } else if (k === 'i') {
        e.preventDefault()
        apply(actions[1])
      } else if (k === 'k') {
        e.preventDefault()
        apply(actions[4])
      } else if (e.shiftKey && k === 'c') {
        e.preventDefault()
        apply(actions[6])
      }
    }

    ta.addEventListener('keydown', onKey)
    return () => ta.removeEventListener('keydown', onKey)
  }, [apply, textareaRef])

  const visibleActions: Action[] = [
    ...actions,
    {
      kind: 'custom',
      label: 'Image',
      run: () => onInsertImage?.(),
    },
  ]

  return (
    <div
      role="toolbar"
      aria-label="Formatacao markdown"
      className="flex flex-wrap gap-1 rounded border bg-muted/40 p-1"
    >
      {visibleActions.map((a) => (
        <button
          key={a.label}
          type="button"
          onClick={() => apply(a)}
          aria-label={'shortcut' in a && a.shortcut ? `${a.label} (${a.shortcut})` : a.label}
          title={'shortcut' in a && a.shortcut ? `${a.label} (${a.shortcut})` : a.label}
          className="rounded border bg-card px-2 py-1 text-xs hover:bg-muted"
        >
          {a.label}
        </button>
      ))}
    </div>
  )
}
