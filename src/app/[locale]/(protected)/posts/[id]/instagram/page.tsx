'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight, Instagram } from 'lucide-react'
import { InstagramPublisherPanel } from './_components/InstagramPublisherPanel'

export default function InstagramPostPage() {
  const params = useParams()
  const postId = params?.id as string
  const locale = (params?.locale as string) ?? 'pt-BR'

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href={`/${locale}/calendar`} className="transition-colors hover:text-foreground">
          Calendário
        </Link>
        <ChevronRight className="h-3 w-3" aria-hidden />
        <Link href={`/${locale}/posts/${postId}`} className="transition-colors hover:text-foreground">
          Post
        </Link>
        <ChevronRight className="h-3 w-3" aria-hidden />
        <span className="font-medium text-foreground">Instagram</span>
      </nav>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Instagram className="h-6 w-6" aria-hidden />
            Instagram
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Revise legenda, hashtags, imagem e horário antes da aprovação humana e publicação Graph.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-sm" role="navigation" aria-label="Canais">
          <Link
            href={`/${locale}/posts/${postId}/linkedin`}
            className="rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:bg-muted"
          >
            LinkedIn
          </Link>
          <span className="rounded-md bg-primary px-3 py-1.5 font-medium text-primary-foreground">
            Instagram
          </span>
          <Link
            href={`/${locale}/posts/${postId}/tiktok`}
            className="rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:bg-muted"
          >
            TikTok
          </Link>
          <Link
            href={`/${locale}/posts/${postId}/youtube`}
            className="rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:bg-muted"
          >
            YouTube
          </Link>
        </div>
      </div>

      <InstagramPublisherPanel postId={postId} />
    </div>
  )
}
