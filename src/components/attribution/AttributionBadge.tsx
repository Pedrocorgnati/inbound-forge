'use client'

import { useTranslations } from 'next-intl'
import type { AttributionType } from '@/types/enums'

type AttributionBadgeType = AttributionType | 'INFERRED'

const ATTRIBUTION_CLASS_MAP: Record<AttributionBadgeType, string> = {
  FIRST_TOUCH: 'bg-blue-600 text-white',
  ASSISTED_TOUCH: 'bg-blue-200 text-blue-800',
  INFERRED: 'bg-neutral-200 text-neutral-600',
}

interface AttributionBadgeProps {
  type: AttributionBadgeType
}

export function AttributionBadge({ type }: AttributionBadgeProps) {
  const t = useTranslations('attribution')
  const className = ATTRIBUTION_CLASS_MAP[type] ?? 'bg-muted text-foreground'
  const typeLabels: Record<AttributionBadgeType, string> = {
    FIRST_TOUCH: t('types.FIRST_TOUCH'),
    ASSISTED_TOUCH: t('types.ASSISTED_TOUCH'),
    INFERRED: t('types.INFERRED'),
  }
  const label = typeLabels[type] ?? type

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${className}`}
      aria-label={`${t('title')}: ${label}`}
      data-testid={`attribution-badge-${type.toLowerCase()}`}
    >
      {label}
    </span>
  )
}
