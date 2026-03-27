'use client'

import * as React from 'react'
import { RefreshCw } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { generateSlug } from '@/lib/utils/slug'

interface SlugFieldProps {
  title: string
  value: string
  onChange: (slug: string) => void
  error?: string
}

export function SlugField({ title, value, onChange, error }: SlugFieldProps) {
  const [isManual, setIsManual] = React.useState(false)
  const prevTitleRef = React.useRef(title)

  // Auto-generate slug from title when not in manual mode
  React.useEffect(() => {
    if (isManual) return
    if (title !== prevTitleRef.current) {
      prevTitleRef.current = title
      const slug = generateSlug(title)
      if (slug) {
        onChange(slug)
      }
    }
  }, [title, isManual, onChange])

  function handleManualChange(e: React.ChangeEvent<HTMLInputElement>) {
    setIsManual(true)
    onChange(e.target.value)
  }

  function handleRegenerate() {
    setIsManual(false)
    const slug = generateSlug(title)
    onChange(slug)
  }

  return (
    <div className="space-y-1">
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Input
            label="Slug"
            value={value}
            onChange={handleManualChange}
            error={error}
            placeholder="url-do-artigo"
            helperText={isManual ? 'Modo manual ativo' : 'Gerado automaticamente do titulo'}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleRegenerate}
          className="mb-[1px]"
          aria-label="Regenerar slug a partir do titulo"
        >
          <RefreshCw className="mr-1 h-3 w-3" aria-hidden />
          Regenerar
        </Button>
      </div>
    </div>
  )
}
