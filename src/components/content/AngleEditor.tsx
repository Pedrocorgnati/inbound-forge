'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Pencil, Save } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface AngleEditorProps {
  angleId: string
  angleName: string
  body: string
  editedBody: string | null
  onSave: (angleId: string, editedBody: string) => Promise<void>
  charCounterId?: string
  disabled?: boolean
  className?: string
}

export function AngleEditor({
  angleId,
  angleName,
  body,
  editedBody,
  onSave,
  charCounterId,
  disabled,
  className,
}: AngleEditorProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(editedBody ?? body)
  const [isSaving, setIsSaving] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const displayText = editedBody ?? body

  // Sync draft when external data changes
  useEffect(() => {
    if (!isEditing) {
      setDraft(editedBody ?? body)
    }
  }, [editedBody, body, isEditing])

  // Auto-resize textarea
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      const ta = textareaRef.current
      ta.style.height = 'auto'
      ta.style.height = `${ta.scrollHeight}px`
    }
  }, [isEditing, draft])

  // Focus textarea on edit mode
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [isEditing])

  const handleSave = useCallback(async () => {
    if (draft === displayText) {
      setIsEditing(false)
      return
    }
    setIsSaving(true)
    try {
      await onSave(angleId, draft)
      setIsEditing(false)
    } finally {
      setIsSaving(false)
    }
  }, [angleId, draft, displayText, onSave])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
      if (e.key === 'Escape') {
        setDraft(displayText)
        setIsEditing(false)
      }
    },
    [handleSave, displayText]
  )

  if (isEditing) {
    return (
      <div className={cn('flex flex-col gap-2', className)}>
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          disabled={isSaving}
          aria-label={`Editar texto do ângulo ${angleName}`}
          aria-describedby={charCounterId}
          className={cn(
            'w-full resize-none rounded-md border border-input bg-background p-3 text-sm',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            'disabled:opacity-50'
          )}
          rows={6}
          data-testid={`angle-editor-textarea-${angleId}`}
        />
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSave}
            isLoading={isSaving}
            loadingText="Salvando..."
            data-testid={`angle-editor-save-${angleId}`}
          >
            <Save className="h-3.5 w-3.5" />
            Salvar
          </Button>
          <span className="text-xs text-muted-foreground">Ctrl+S para salvar, Esc para cancelar</span>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('group relative', className)}>
      <div
        className="whitespace-pre-wrap text-sm text-foreground leading-relaxed"
        data-testid={`angle-editor-display-${angleId}`}
      >
        {displayText}
      </div>
      {!disabled && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsEditing(true)}
          className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label={`Editar texto do ângulo ${angleName}`}
          data-testid={`angle-editor-edit-btn-${angleId}`}
        >
          <Pencil className="h-3.5 w-3.5" />
          Editar
        </Button>
      )}
    </div>
  )
}
