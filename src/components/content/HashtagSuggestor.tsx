'use client'

import { useState, useCallback } from 'react'
import { X, Plus, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface HashtagSuggestorProps {
  hashtags: string[]
  aiGenerated?: boolean
  onChange: (hashtags: string[]) => void
  disabled?: boolean
  className?: string
}

export function HashtagSuggestor({
  hashtags,
  aiGenerated = true,
  onChange,
  disabled,
  className,
}: HashtagSuggestorProps) {
  const [newTag, setNewTag] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  const handleAdd = useCallback(() => {
    const tag = newTag.trim().replace(/^#/, '')
    if (!tag) return
    if (hashtags.includes(`#${tag}`)) {
      setNewTag('')
      return
    }
    onChange([...hashtags, `#${tag}`])
    setNewTag('')
    setIsAdding(false)
  }, [newTag, hashtags, onChange])

  const handleRemove = useCallback(
    (tagToRemove: string) => {
      onChange(hashtags.filter((t) => t !== tagToRemove))
    },
    [hashtags, onChange]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleAdd()
      }
      if (e.key === 'Escape') {
        setNewTag('')
        setIsAdding(false)
      }
    },
    [handleAdd]
  )

  return (
    <div className={cn('space-y-2', className)} data-testid="hashtag-suggestor">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-foreground">Hashtags</span>
        {aiGenerated && (
          <Badge variant="info" className="gap-1">
            <Sparkles className="h-3 w-3" />
            Geradas pela IA
          </Badge>
        )}
      </div>

      <div role="list" className="flex flex-wrap gap-2" aria-label="Hashtags">
        {hashtags.map((tag) => (
          <span
            key={tag}
            role="listitem"
            className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-foreground"
          >
            {tag}
            {!disabled && (
              <button
                type="button"
                onClick={() => handleRemove(tag)}
                className="ml-0.5 rounded-full p-0.5 hover:bg-foreground/10 transition-colors"
                aria-label={`Remover hashtag ${tag}`}
                data-testid={`remove-hashtag-${tag}`}
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </span>
        ))}
      </div>

      {!disabled && (
        <>
          {isAdding ? (
            <div className="flex items-center gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="#suahashtag"
                autoFocus
                aria-label="Nova hashtag"
                data-testid="new-hashtag-input"
              />
              <Button
                size="sm"
                onClick={handleAdd}
                disabled={!newTag.trim()}
                data-testid="add-hashtag-confirm"
              >
                Adicionar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setNewTag('')
                  setIsAdding(false)
                }}
                data-testid="add-hashtag-cancel"
              >
                Cancelar
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAdding(true)}
              data-testid="add-hashtag-btn"
            >
              <Plus className="h-3.5 w-3.5" />
              Adicionar hashtag
            </Button>
          )}
        </>
      )}
    </div>
  )
}
