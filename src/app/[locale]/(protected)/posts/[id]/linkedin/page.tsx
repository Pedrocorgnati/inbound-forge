'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { LinkedInExportPanel } from '@/components/publishing/LinkedInExportPanel'

export default function LinkedInExportPage() {
  const params = useParams()
  const postId = params?.id as string
  const locale = (params?.locale as string) ?? 'pt-BR'

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-6">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href={`/${locale}/calendar`} className="hover:text-foreground transition-colors">
          Calendario
        </Link>
        <ChevronRight className="h-3 w-3" />
        <Link href={`/${locale}/posts/${postId}`} className="hover:text-foreground transition-colors">
          Post
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground font-medium">Exportar para LinkedIn</span>
      </nav>

      <h1 className="text-2xl font-bold tracking-tight">Exportar para LinkedIn</h1>

      <LinkedInExportPanel postId={postId} />
    </div>
  )
}
