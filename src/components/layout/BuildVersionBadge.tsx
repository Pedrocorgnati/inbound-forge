'use client'

/**
 * TASK-12 (CL-229) — Badge com versao + commit SHA no footer.
 */
import { toast } from 'sonner'

export function BuildVersionBadge() {
  const version = process.env.NEXT_PUBLIC_BUILD_VERSION ?? 'dev'
  const sha = process.env.NEXT_PUBLIC_BUILD_SHA ?? 'dev'
  const full = `v${version} · ${sha}`

  async function copy() {
    try {
      await navigator.clipboard.writeText(full)
      toast.success('Versao copiada')
    } catch {
      toast.error('Falha ao copiar')
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
