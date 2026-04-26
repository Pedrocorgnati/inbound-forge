/**
 * LeadBookingsList — Intake Review TASK-1 ST006 (CL-105/106)
 *
 * Renderiza bookings Cal.com associados ao lead (ConversionEvent type=CALENDAR_BOOKING).
 * Server Component: consulta direta via prisma, sem rota /api separada.
 */
import { prisma } from '@/lib/prisma'
import { BookingCancelButton } from './BookingCancelButton'

interface Props {
  leadId: string
}

const STATUS_LABEL: Record<string, { label: string; tone: string }> = {
  scheduled: { label: 'Agendada', tone: 'bg-emerald-500/10 text-emerald-600 border-emerald-600/20' },
  canceled: { label: 'Cancelada', tone: 'bg-destructive/10 text-destructive border-destructive/20' },
}

export async function LeadBookingsList({ leadId }: Props) {
  const bookings = await prisma.conversionEvent.findMany({
    where: { leadId, type: 'CALENDAR_BOOKING' },
    orderBy: { occurredAt: 'desc' },
    select: {
      id: true,
      externalBookingId: true,
      bookingStatus: true,
      occurredAt: true,
      createdAt: true,
      utmCampaign: true,
      notes: true,
    },
  })

  if (bookings.length === 0) {
    return (
      <p
        className="text-sm text-muted-foreground"
        data-testid="lead-bookings-empty"
      >
        Nenhum agendamento Cal.com associado a este lead.
      </p>
    )
  }

  const fmt = new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  })

  return (
    <ul
      className="space-y-2"
      data-testid="lead-bookings-list"
    >
      {bookings.map((b) => {
        const statusKey = b.bookingStatus ?? 'scheduled'
        const tone = STATUS_LABEL[statusKey] ?? {
          label: statusKey,
          tone: 'bg-muted text-foreground border-border',
        }
        return (
          <li
            key={b.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-card px-3 py-2 text-sm"
            data-testid="lead-booking-row"
          >
            <div className="flex flex-col">
              <span className="font-medium">{fmt.format(b.occurredAt)}</span>
              <span className="text-xs text-muted-foreground">
                ID Cal.com: {b.externalBookingId ?? '-'}
                {b.utmCampaign ? ` · ${b.utmCampaign}` : ''}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`rounded-full border px-2 py-0.5 text-xs font-medium ${tone.tone}`}
              >
                {tone.label}
              </span>
              {/* Intake Review TASK-10 ST002 (CL-258) */}
              {statusKey !== 'canceled' && (
                <BookingCancelButton leadId={leadId} bookingId={b.id} />
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
