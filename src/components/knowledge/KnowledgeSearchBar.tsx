'use client'

import { useCallback, useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { useDebounce } from '@/hooks/useDebounce'

export interface KnowledgeFilters {
  search: string
  status: string
  type: string
}

interface KnowledgeSearchBarProps {
  onChange: (filters: KnowledgeFilters) => void
}

const STATUS_OPTIONS = [
  { value: '', label: 'Todos os status' },
  { value: 'ACTIVE', label: 'Ativo' },
  { value: 'DRAFT', label: 'Rascunho' },
]

const TYPE_OPTIONS = [
  { value: '', label: 'Todos os tipos' },
  { value: 'cases', label: 'Cases' },
  { value: 'pains', label: 'Dores' },
  { value: 'patterns', label: 'Padrões' },
  { value: 'objections', label: 'Objeções' },
]

export function KnowledgeSearchBar({ onChange }: KnowledgeSearchBarProps) {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [type, setType] = useState('')

  const debouncedSearch = useDebounce(search, 300)

  const notify = useCallback(
    (s: string, st: string, ty: string) => {
      onChange({ search: s, status: st, type: ty })
    },
    [onChange],
  )

  useEffect(() => {
    notify(debouncedSearch, status, type)
  }, [debouncedSearch, status, type, notify])

  return (
    <div
      data-testid="knowledge-search-bar"
      className="flex flex-col gap-3 sm:flex-row sm:items-center"
    >
      <div className="relative flex-1">
        <Search
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          data-testid="knowledge-search-input"
          type="search"
          placeholder="Buscar na base de conhecimento..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
          aria-label="Buscar na base de conhecimento"
        />
      </div>

      <Select
        data-testid="knowledge-filter-status"
        options={STATUS_OPTIONS}
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        aria-label="Filtrar por status"
        className="w-full sm:w-44"
      />

      <Select
        data-testid="knowledge-filter-type"
        options={TYPE_OPTIONS}
        value={type}
        onChange={(e) => setType(e.target.value)}
        aria-label="Filtrar por tipo"
        className="w-full sm:w-44"
      />
    </div>
  )
}
