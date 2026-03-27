import type { AttributionType } from '@/types/enums'

type AttributionBadgeType = AttributionType | 'INFERRED'

const ATTRIBUTION_MAP: Record<AttributionBadgeType, { label: string; className: string }> = {
  FIRST_TOUCH: { label: 'First Touch', className: 'bg-blue-600 text-white' },
  ASSISTED_TOUCH: { label: 'Assistida', className: 'bg-blue-200 text-blue-800' },
  ASSISTED: { label: 'Assistida', className: 'bg-blue-200 text-blue-800' },
  INFERRED: { label: 'Inferida', className: 'bg-neutral-200 text-neutral-600' },
}

interface AttributionBadgeProps {
  type: AttributionBadgeType
}

export function AttributionBadge({ type }: AttributionBadgeProps) {
  const config = ATTRIBUTION_MAP[type] ?? { label: type, className: 'bg-muted text-foreground' }

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${config.className}`}
      aria-label={`Tipo de atribuicao: ${config.label}`}
      data-testid={`attribution-badge-${type.toLowerCase()}`}
    >
      {config.label}
    </span>
  )
}
