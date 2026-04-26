// Server Component auxiliar — header de versionamento para Terms/Privacy
// Intake-Review TASK-21 ST006 (CL-OP-028).
import { formatLegalHeader, type LegalDoc } from '@/lib/legal/versions'

type Props = {
  doc: LegalDoc
  locale: string
  className?: string
}

export function LegalVersionHeader({ doc, locale, className }: Props) {
  return (
    <p
      className={className ?? 'mb-2 text-xs uppercase tracking-wide text-muted-foreground'}
      data-testid={`legal-version-${doc}`}
    >
      {formatLegalHeader(doc, locale)}
    </p>
  )
}
