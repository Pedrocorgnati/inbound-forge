import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getLead } from '@/lib/data/leads.data'
import { LeadDetailClient } from '@/components/leads/LeadDetailClient'
// TASK-18 (CL-268/269): CRUD completo — edicao de dados + delete com confirm.
import { LeadEditForm } from '@/components/leads/LeadEditForm'
import { LeadDeleteDialog } from '@/components/leads/LeadDeleteDialog'
// TASK-8 (CL-202): timeline de jornada do lead
import { LeadJourneyTimeline } from '@/components/leads/LeadJourneyTimeline'
// Intake Review TASK-1 ST006 (CL-105/106): bookings Cal.com associados ao lead.
import { LeadBookingsList } from '@/components/leads/LeadBookingsList'

type Props = {
  params: Promise<{ locale: string; id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const lead = await getLead(id)

  if (!lead) {
    return { title: 'Lead não encontrado | Inbound Forge' }
  }

  const company = lead.company ?? 'Lead'
  return {
    title: `${company} | Leads | Inbound Forge`,
  }
}

export default async function LeadDetailPage({ params }: Props) {
  const { locale, id } = await params
  const lead = await getLead(id)

  if (!lead) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{lead.company ?? lead.name ?? 'Lead'}</h1>
        <LeadDeleteDialog leadId={id} leadName={lead.name ?? lead.company} locale={locale}>
          <button
            type="button"
            className="rounded-md border border-destructive/40 px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10"
            data-testid="lead-delete-open"
          >
            Excluir
          </button>
        </LeadDeleteDialog>
      </div>

      <LeadDetailClient />

      <section data-testid="lead-journey">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Jornada
        </h2>
        <LeadJourneyTimeline leadId={id} />
      </section>

      <section data-testid="lead-bookings">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Agendamentos Cal.com
        </h2>
        <LeadBookingsList leadId={id} />
      </section>

      <section data-testid="lead-edit-tab">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Editar dados
        </h2>
        <LeadEditForm
          leadId={id}
          initial={{
            name: lead.name ?? '',
            company: lead.company ?? '',
            contactInfo: '',
            funnelStage: (lead.funnelStage ?? undefined) as 'MQL' | 'SQL' | 'CUSTOMER' | 'VISITOR' | 'LEAD' | undefined,
            channel: (lead.channel ?? undefined) as 'OTHER' | 'DIRECT' | 'EMAIL' | 'ORGANIC' | 'REFERRAL' | 'SOCIAL' | 'PAID' | undefined,
            notes: lead.notes ?? '',
          }}
        />
      </section>
    </div>
  )
}
