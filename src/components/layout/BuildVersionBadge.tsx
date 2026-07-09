'use client'

/**
 * TASK-12 (CL-229) — Badge com versao + commit SHA no footer.
 */
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

export function BuildVersionBadge() {
  const tToast = useTranslations('toasts')
  const version = process.env.NEXT_PUBLIC_BUILD_VERSION ?? 'dev'
  const sha = process.env.NEXT_PUBLIC_BUILD_SHA ?? 'dev'
  const full = `v${version} · ${sha}`

  async function copy() {
    try {
      await navigator.clipboard.writeText(full)
      toast.success(tToast('layout.version_copied'))
    } catch {
      toast.error(tToast('common.copy_failed'))
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="text-xs text-muted-foreground hover:text-foreground"
      data-testid="build-version-badge"
      title="Copiar versao completa"
    >
      {full}
    </button>
  )
}
