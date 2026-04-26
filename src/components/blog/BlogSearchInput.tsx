/**
 * Intake-Review TASK-4 (CL-302): input de busca do blog publico.
 * Usa form com action server-side — sem JS roda como GET normal.
 */
'use client'

import { Search } from 'lucide-react'

interface BlogSearchInputProps {
  locale: string
  initialQuery?: string
}

export function BlogSearchInput({ locale, initialQuery = '' }: BlogSearchInputProps) {
  return (
    <form
      action={`/${locale}/blog/search`}
      method="get"
      role="search"
      className="flex w-full max-w-md items-center gap-2"
    >
      <label htmlFor="blog-search" className="sr-only">
        Buscar artigos
      </label>
      <div className="relative flex-1">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        />
        <input
          id="blog-search"
          type="search"
          name="q"
          defaultValue={initialQuery}
          placeholder="Buscar artigos..."
          className="h-10 w-full rounded-md border border-border bg-background pl-9 pr-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
          minLength={2}
          maxLength={100}
        />
      </div>
      <button
        type="submit"
        className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Buscar
      </button>
    </form>
  )
}
