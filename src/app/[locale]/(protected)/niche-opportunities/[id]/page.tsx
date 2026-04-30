// /[locale]/(protected)/niche-opportunities/[id]
// Intake-Review TASK-21 ST002 (CL-TH-058): drill-down da oportunidade.
// Server Component consulta via Prisma direto — sem round-trip extra de fetch.

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'

interface PageProps {
  params: Promise<{ locale: string; id: string }>
}

export default async function NicheOpportunityDetailPage({ params }: PageProps) {
  const { locale, id } = await params

  const niche = await prisma.nicheOpportunity.findUnique({
    where: { id },
    include: {
      themes: {
        select: {
          id: true,
          title: true,
          status: true,
          conversionScore: true, // taxa real (CX-01)
          priorityScore: true,   // composto (MS13-B002)
          lastPublishedAt: true,
        },
        // MS13-B002: priorização operativa usa o composto.
        orderBy: { priorityScore: 'desc' },
        take: 20,
      },
    },
  })

  if (!niche) notFound()

  return (
    <section className="space-y-6" data-testid="niche-opportunity-detail">
      <header className="border-b pb-4">
        <Link
          href={`/${locale}/niche-opportunities`}
          className="text-xs text-muted-foreground hover:underline"
        >
          &larr; Voltar
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">{niche.sector}</h1>
        <p className="text-sm text-muted-foreground">
          Pain: {niche.painCategory}
          {niche.reviewNote ? ` — ${niche.reviewNote}` : ''}
        </p>
      </header>

      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3" data-testid="niche-opportunity-scores">
        <div className="rounded border border-border bg-card p-3">
          <dt className="text-xs text-muted-foreground">Potential score</dt>
          <dd className="text-2xl font-semibold">
            {typeof niche.potentialScore === 'number'
              ? niche.potentialScore.toFixed(1)
              : '—'}
          </dd>
        </div>
        <div className="rounded border border-border bg-card p-3">
          <dt className="text-xs text-muted-foreground">Geo ready</dt>
          <dd className="text-2xl font-semibold">{niche.isGeoReady ? 'Sim' : 'Nao'}</dd>
        </div>
        <div className="rounded border border-border bg-card p-3">
          <dt className="text-xs text-muted-foreground">Status</dt>
          <dd className="text-2xl font-semibold">{niche.status}</dd>
        </div>
      </dl>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Temas relacionados</h2>
        {niche.themes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum tema foi gerado ainda a partir desta oportunidade.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-2 py-1">Tema</th>
                <th className="px-2 py-1">Status</th>
                <th className="px-2 py-1">Conversion</th>
                <th className="px-2 py-1">Publicado em</th>
              </tr>
            </thead>
            <tbody>
              {niche.themes.map((t) => (
                <tr key={t.id} className="border-t">
                  <td className="px-2 py-1">
                    <Link
                      href={`/${locale}/themes/${t.id}`}
                      className="hover:underline"
                    >
                      {t.title}
                    </Link>
                  </td>
                  <td className="px-2 py-1 text-muted-foreground">{t.status}</td>
                  <td className="px-2 py-1 tabular-nums">{t.priorityScore}</td>
                  <td className="px-2 py-1 text-xs text-muted-foreground">
                    {t.lastPublishedAt
                      ? new Date(t.lastPublishedAt).toLocaleDateString()
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <p className="text-xs text-muted-foreground">
        Historia de ajustes manuais esta disponivel via /api/v1/niche-opportunities/{niche.id}.
      </p>
    </section>
  )
}
