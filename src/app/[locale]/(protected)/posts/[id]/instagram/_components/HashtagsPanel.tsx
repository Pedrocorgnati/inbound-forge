'use client'

import { useMemo, useState } from 'react'
import { Hash, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PUBLISHING_CHANNELS } from '@/lib/constants/publishing'

interface HashtagsPanelProps {
  hashtags: string[]
  painTitle?: string | null
  targetNiche?: string | null
  onChange: (hashtags: string[]) => void
}

const MAX_HASHTAGS = PUBLISHING_CHANNELS.INSTAGRAM.maxHashtags

function normalizeTag(value: string): string {
  return value
    .replace(/^#/, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_]/g, '')
    .toLowerCase()
    .slice(0, 40)
}

function tokensFromText(text: string | null | undefined): string[] {
  if (!text) return []
  return text
    .split(/\s+/)
    .map(normalizeTag)
    .filter((token) => token.length >= 4)
    .slice(0, 6)
}

export function HashtagsPanel({
  hashtags,
  painTitle,
  targetNiche,
  onChange,
}: HashtagsPanelProps) {
  const [draft, setDraft] = useState('')

  const suggestions = useMemo(() => {
    const base = [
      ...tokensFromText(painTitle),
      ...tokensFromText(targetNiche),
      'automacao',
      'processos',
      'produtividade',
      'software',
      'negocios',
    ]
    return Array.from(new Set(base)).filter((tag) => !hashtags.includes(tag)).slice(0, 8)
  }, [hashtags, painTitle, targetNiche])

  function addTag(raw: string) {
    const tag = normalizeTag(raw)
    if (!tag || hashtags.includes(tag) || hashtags.length >= MAX_HASHTAGS) return
    onChange([...hashtags, tag])
    setDraft('')
  }

  function removeTag(tag: string) {
    onChange(hashtags.filter((item) => item !== tag))
  }

  const limitReached = hashtags.length >= MAX_HASHTAGS

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Hash className="h-4 w-4" aria-hidden />
          Hashtags
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                addTag(draft)
              }
            }}
            disabled={limitReached}
            className="min-h-11 flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
            placeholder="nova hashtag"
            aria-label="Nova hashtag"
          />
          <Button type="button" variant="outline" size="icon" onClick={() => addTag(draft)} disabled={limitReached}>
            <Plus className="h-4 w-4" aria-hidden />
            <span className="sr-only">Adicionar hashtag</span>
          </Button>
        </div>

        <div className="flex flex-wrap gap-2" aria-live="polite">
          {hashtags.length > 0 ? hashtags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
            >
              #{tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="rounded-full p-0.5 hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-ring"
                aria-label={`Remover hashtag ${tag}`}
              >
                <X className="h-3 w-3" aria-hidden />
              </button>
            </span>
          )) : (
            <p className="text-sm text-muted-foreground">Nenhuma hashtag selecionada.</p>
          )}
        </div>

        {suggestions.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase text-muted-foreground">Sugestões</p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => addTag(tag)}
                  disabled={limitReached}
                  className="rounded-full border border-border px-2.5 py-1 text-xs text-foreground transition-colors hover:bg-muted disabled:opacity-50"
                >
                  #{tag}
                </button>
              ))}
            </div>
          </div>
        )}

        <p className={hashtags.length > MAX_HASHTAGS ? 'text-xs text-red-600' : 'text-xs text-muted-foreground'}>
          {hashtags.length}/{MAX_HASHTAGS} hashtags
        </p>
      </CardContent>
    </Card>
  )
}
