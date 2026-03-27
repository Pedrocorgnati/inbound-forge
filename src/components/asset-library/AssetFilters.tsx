'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Search } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'

interface AssetFilterState {
  fileType?: string
  tag?: string
}

interface AssetFiltersProps {
  filter: AssetFilterState
  onChange: (filter: AssetFilterState) => void
}

const FILE_TYPE_OPTIONS = [
  { value: 'image/png', label: 'PNG' },
  { value: 'image/jpeg', label: 'JPG' },
  { value: 'image/webp', label: 'WebP' },
  { value: 'image/svg+xml', label: 'SVG' },
] as const

export function AssetFilters({ filter, onChange }: AssetFiltersProps) {
  const [tagInput, setTagInput] = useState(filter.tag ?? '')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync external filter changes
  useEffect(() => {
    setTagInput(filter.tag ?? '')
  }, [filter.tag])

  const handleTypeChange = useCallback(
    (type: string, checked: boolean) => {
      if (checked) {
        onChange({ ...filter, fileType: type })
      } else {
        // Uncheck = clear type filter
        onChange({ ...filter, fileType: undefined })
      }
    },
    [filter, onChange],
  )

  const handleTagChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      setTagInput(value)

      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }

      debounceRef.current = setTimeout(() => {
        onChange({ ...filter, tag: value || undefined })
      }, 300)
    },
    [filter, onChange],
  )

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [])

  return (
    <div
      role="search"
      aria-label="Filtros de assets"
      className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-6"
    >
      {/* File type checkboxes */}
      <fieldset className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <legend className="text-sm font-medium text-foreground mb-1 sm:mb-0 sm:mr-2">
          Tipo
        </legend>
        {FILE_TYPE_OPTIONS.map((opt) => (
          <Checkbox
            key={opt.value}
            label={opt.label}
            checked={filter.fileType === opt.value}
            onCheckedChange={(checked) =>
              handleTypeChange(opt.value, checked === true)
            }
            aria-label={`Filtrar por ${opt.label}`}
          />
        ))}
      </fieldset>

      {/* Tag search */}
      <div className="flex-1 max-w-xs">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
            aria-hidden
          />
          <Input
            value={tagInput}
            onChange={handleTagChange}
            placeholder="Buscar por tag..."
            className="pl-9"
            aria-label="Buscar assets por tag"
          />
        </div>
      </div>
    </div>
  )
}
