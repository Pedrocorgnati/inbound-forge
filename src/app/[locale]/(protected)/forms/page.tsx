import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { prisma } from '@/lib/prisma'
import { FormBuilderClient } from '@/components/forms/FormBuilderClient'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'forms' })
  return { title: `${t('title')} | Inbound Forge` }
}

export default async function FormsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'forms' })

  let forms: Awaited<ReturnType<typeof prisma.leadForm.findMany>> = []
  let loadError = false
  try {
    forms = await prisma.leadForm.findMany({ orderBy: { createdAt: 'desc' }, take: 100 })
  } catch {
    loadError = true
  }

  return (
    <div data-testid="forms-page" className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t('title')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('description')}</p>
        </div>
        <FormBuilderClient />
      </div>

      {loadError ? (
        <p data-testid="forms-error" className="text-sm text-red-600">{t('error')}</p>
      ) : forms.length === 0 ? (
        <p data-testid="forms-empty" className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">{t('empty')}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table data-testid="forms-table" className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2">{t('colName')}</th>
                <th className="px-4 py-2">{t('colKind')}</th>
                <th className="px-4 py-2">{t('colStatus')}</th>
                <th className="px-4 py-2">{t('colSubmissions')}</th>
                <th className="px-4 py-2">{t('publicUrl')}</th>
              </tr>
            </thead>
            <tbody>
              {forms.map((form) => (
                <tr key={form.id} className="border-t">
                  <td className="px-4 py-2 font-medium">{form.name}</td>
                  <td className="px-4 py-2">{t(`kind.${form.kind}`)}</td>
                  <td className="px-4 py-2">{t(`status.${form.status}`)}</td>
                  <td className="px-4 py-2 text-muted-foreground">{form.submissionCount}</td>
                  <td className="px-4 py-2">
                    {form.status === 'PUBLISHED' ? (
                      <a href={`/${locale}/f/${form.slug}`} target="_blank" rel="noopener noreferrer" className="font-mono text-xs text-primary hover:underline">
                        /f/{form.slug}
                      </a>
                    ) : (
                      <span className="font-mono text-xs text-muted-foreground">/f/{form.slug}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
