'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { YouTubeExportPanel } from '@/components/publishing/YouTubeExportPanel'

export default function YouTubeExportPage() {
  const params = useParams()
  const postId = params?.id as string
  const locale = (params?.locale as string) ?? 'pt-BR'

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-6">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href={`/${locale}/calendar`} className="hover:text-foreground transition-colors">
          Calendário
        </Link>
        <ChevronRight className="h-3 w-3" />
        <Link href={`/${locale}/posts/${postId}`} className="hover:text-foreground transition-colors">
          Post
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground font-medium">YouTube Shorts</span>
      </nav>

      <h1 className="text-2xl font-bold tracking-tight">Exportar para YouTube Shorts</h1>

      {/* Navegação entre canais */}
      <div className="flex gap-2 text-sm" role="navigation" aria-label="Canais">
        <Link
          href={`/${locale}/posts/${postId}/linkedin`}
          className="rounded-md px-3 py-1.5 text-muted-foreground hover:bg-muted transition-colors"
        >
          LinkedIn
        </Link>
        <Link
          href={`/${locale}/posts/${postId}/tiktok`}
          className="rounded-md px-3 py-1.5 text-muted-foreground hover:bg-muted transition-colors"
        >
          TikTok
        </Link>
        <span className="rounded-md bg-primary px-3 py-1.5 text-primary-foreground font-medium">
          YouTube
        </span>
      </div>

      <YouTubeExportPanel postId={postId} />
    </div>
  )
}
