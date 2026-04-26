import type { ConversionType } from '@/types/enums'

const CONVERSION_MAP: Record<ConversionType, { label: string; className: string }> = {
  CONVERSATION: { label: 'Conversa', className: 'bg-blue-100 text-blue-800' },
  MEETING: { label: 'Reuniao', className: 'bg-yellow-100 text-yellow-800' },
  PROPOSAL: { label: 'Proposta', className: 'bg-green-100 text-green-800' },
  CALENDAR_BOOKING: { label: 'Agendamento', className: 'bg-purple-100 text-purple-800' },
}

interface ConversionBadgeProps {
  type: ConversionType
}

export function ConversionBadge({ type }: ConversionBadgeProps) {
  const config = CONVERSION_MAP[type] ?? { label: type, className: 'bg-muted text-foreground' }

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${config.className}`}
      aria-label={`Tipo de conversao: ${config.label}`}
      data-testid={`conversion-badge-${type.toLowerCase()}`}
    >
      {config.label}
    </span>
  )
}
