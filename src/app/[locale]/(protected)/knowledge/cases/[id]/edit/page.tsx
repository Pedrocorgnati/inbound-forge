'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from '@/components/ui/toast'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { CaseForm } from '@/components/knowledge/CaseForm'
import { KnowledgeBacklinks } from '@/components/knowledge/KnowledgeBacklinks'
import { AlertTriangle } from 'lucide-react'
import type { CaseResponse } from '@/lib/dtos/case-library.dto'

export default function EditCasePage() {
  const params = useParams<{ locale: string; id: string }>()
  const router = useRouter()
  const locale = params.locale
  const id = params.id
  const t = useTranslations('knowledge.casePage')

  const [caseData, setCaseData] = useState<CaseResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchCase() {
      setIsLoading(true)
      setError(null)

      try {
        const res = await fetch(`/api/knowledge/cases/${id}`)
        if (!res.ok) {
          if (res.status === 404) {
            toast.error(t('notFound'))
            router.push(`/${locale}/knowledge?tab=cases`)
            return
          }
          throw new Error(t('loadError'))
        }

        const json = await res.json()
        setCaseData(json.data)
      } catch {
        setError(t('loadError'))
      } finally {
        setIsLoading(false)
      }
    }

    fetchCase()
  }, [id, locale, router, t])

  if (isLoading) {
    return (
      <div data-testid="edit-case-loading" className="mx-auto max-w-2xl space-y-4">
        <Skeleton variant="text" className="h-8 w-48" />
        <Skeleton variant="text" className="h-4 w-72" />
        <div className="space-y-4 mt-6">
          <Skeleton variant="rectangle" className="h-11 w-full" />
          <Skeleton variant="rectangle" className="h-11 w-full" />
          <Skeleton variant="rectangle" className="h-11 w-full" />
          <Skeleton variant="rectangle" className="h-32 w-full" />
        </div>
      </div>
    )
  }

  if (error || !caseData) {
    return (
      <div
        data-testid="edit-case-error"
        className="mx-auto max-w-2xl flex flex-col items-center gap-4 py-12"
      >
        <AlertTriangle className="h-10 w-10 text-danger" />
        <p className="text-sm text-muted-foreground">{error ?? t('notFound')}</p>
        <Button
          variant="outline"
          onClick={() => router.push(`/${locale}/knowledge?tab=cases`)}
        >
          {t('backToCases')}
        </Button>
      </div>
    )
  }

  return (
    <div data-testid="edit-case-page" className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {t('edit')}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {caseData.name}
        </p>
      </div>

      <CaseForm mode="edit" initialData={caseData} locale={locale} />

      <KnowledgeBacklinks type="case" id={id} />
    </div>
  )
}
