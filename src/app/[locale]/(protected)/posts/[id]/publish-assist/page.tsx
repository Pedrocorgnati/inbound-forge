'use client'

import { Suspense } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight, Rocket } from 'lucide-react'
import { SkeletonCard } from '@/components/ui/skeleton'
import { PublishAssistWizard } from './_components/PublishAssistWizard'

export default function PublishAssistPage() {
  const params = useParams()
  const postId = params?.id as string
  const locale = (params?.locale as string) ?? 'pt-BR'

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href={`/${locale}/calendar`} className="transition-colors hover:text-foreground">
          Calendário
        </Link>
        <ChevronRight className="h-3 w-3" aria-hidden />
        <Link href={`/${locale}/posts/${postId}`} className="transition-colors hover:text-foreground">
          Post
        </Link>
        <ChevronRight className="h-3 w-3" aria-hidden />
        <span className="font-medium text-foreground">Publicação assistida</span>
      </nav>

      <div className="space-y-2">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Rocket className="h-6 w-6" aria-hidden />
          Publicação assistida
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Quatro passos para revisar o conteúdo, escolher o canal, gerar o link UTM rastreável e agendar a publicação.
        </p>
      </div>

      <Suspense fallback={<SkeletonCard />}>
        <PublishAssistWizard postId={postId} />
      </Suspense>
    </div>
  )
}
