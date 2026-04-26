// Intake Review TASK-9 ST005 (CL-264) — admin do catalogo de tags do blog.

import type { Metadata } from 'next'
import { TagsAdminTable } from '@/components/blog/TagsAdminTable'

export const metadata: Metadata = {
  title: 'Tags — Admin Blog',
  robots: 'noindex, nofollow',
}

export default function BlogTagsAdminPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Catálogo de Tags</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Renomeie, mescle ou remova tags usadas nos artigos do blog.
        </p>
      </header>
      <TagsAdminTable />
    </div>
  )
}
