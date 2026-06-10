import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { LeadFormRenderClient } from '@/components/forms/LeadFormRenderClient'

export const dynamic = 'force-dynamic'

async function getForm(slug: string) {
  try {
    const form = await prisma.leadForm.findUnique({ where: { slug } })
    if (!form || form.status !== 'PUBLISHED') return null
    return form
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const form = await getForm(slug)
  return { title: form?.headline ?? form?.name ?? 'Form', robots: { index: false } }
}

export default async function PublicFormPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const form = await getForm(slug)
  if (!form) notFound()

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">{form.headline ?? form.name}</h1>
      {form.description && <p className="mt-1 mb-6 text-sm text-muted-foreground">{form.description}</p>}
      {!form.description && <div className="mb-6" />}
      <LeadFormRenderClient
        slug={form.slug}
        kind={form.kind}
        ctaLabel={form.ctaLabel}
        consentText={form.lgpdConsentText}
        successMessage={form.successMessage}
      />
    </main>
  )
}
