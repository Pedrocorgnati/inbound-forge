'use client'

// EntityHardDeleteDialog — wrapper generico para hard-delete (BD irreversivel)
// Intake-Review TASK-14 ST002 (CL-TH-057). Usa ConfirmDialog.confirmationText.
//
// Diferente de Case/Pain/PatternDeleteModal (archive com undo), este e usado
// em endpoints DELETE hard que nao tem rollback. Entidades: Case, Pain,
// Pattern — cada uma exporta um wrapper especializado abaixo.

'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

type EntityKind = 'case' | 'pain' | 'pattern' | 'asset'

type BaseProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  entityId: string
  entityLabel?: string
  apiPath: string
  onDeleted?: () => void
  kind: EntityKind
}

function EntityHardDeleteDialogBase({
  open,
  onOpenChange,
  entityId: _entityId,
  entityLabel,
  apiPath,
  onDeleted,
  kind,
}: BaseProps) {
  const t = useTranslations('common.delete_dialog')
  const [error, setError] = useState<string | null>(null)

  const titleMap: Record<EntityKind, string> = {
    case: t('case_title'),
    pain: t('pain_title'),
    pattern: t('pattern_title'),
    asset: t('asset_title'),
  }
  const warningMap: Record<EntityKind, string> = {
    case: t('case_warning'),
    pain: t('pain_warning'),
    pattern: t('pattern_warning'),
    asset: t('asset_warning'),
  }

  const confirm = async () => {
    setError(null)
    const res = await fetch(apiPath, { method: 'DELETE' })
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      const msg = json?.error ?? `Falha (${res.status})`
      setError(msg)
      toast.error(msg)
      throw new Error(msg)
    }
    toast.success(t('success'))
    onDeleted?.()
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={titleMap[kind]}
      description={
        entityLabel
          ? t('description_with_label', { label: entityLabel })
          : t('description_default')
      }
      confirmLabel={t('confirm_button')}
      cancelLabel={t('cancel')}
      variant="destructive"
      confirmationText={t('confirm_keyword')}
      warning={warningMap[kind] + (error ? ` — ${error}` : '')}
      onConfirm={confirm}
    />
  )
}

export function CaseHardDeleteDialog(props: Omit<BaseProps, 'kind' | 'apiPath'> & { apiPath?: string }) {
  return (
    <EntityHardDeleteDialogBase
      {...props}
      kind="case"
      apiPath={props.apiPath ?? `/api/v1/knowledge/cases/${props.entityId}?hard=true`}
    />
  )
}

export function PainHardDeleteDialog(props: Omit<BaseProps, 'kind' | 'apiPath'> & { apiPath?: string }) {
  return (
    <EntityHardDeleteDialogBase
      {...props}
      kind="pain"
      apiPath={props.apiPath ?? `/api/v1/knowledge/pains/${props.entityId}?hard=true`}
    />
  )
}

export function PatternHardDeleteDialog(props: Omit<BaseProps, 'kind' | 'apiPath'> & { apiPath?: string }) {
  return (
    <EntityHardDeleteDialogBase
      {...props}
      kind="pattern"
      apiPath={props.apiPath ?? `/api/v1/knowledge/patterns/${props.entityId}?hard=true`}
    />
  )
}
