'use client'

// TASK-20 ST002 (CL-280): modal exibido quando a sessao expira (401).
// Oferece salvar rascunho local antes de redirecionar para login.
// Contador regressivo de 30s com redirect automatico.

import { useEffect, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useSessionExpiration, saveDraftSnapshot } from '@/hooks/useSessionExpiration'

const COUNTDOWN_SECONDS = 30

// Intake-Review TASK-19 ST003 (CL-DX-030): preserva pathname + search no redirect
// de login e mantem prefixo de locale para nao reverter idioma ao reautenticar.
function buildLoginRedirect(pathname: string | null, search: string | null): string {
  const p = pathname ?? '/'
  const s = search && search.length > 0 ? `?${search}` : ''
  const current = `${p}${s}`
  const locale = p.match(/^\/(pt-BR|en-US|it-IT|es-ES)/)?.[1] ?? 'pt-BR'
  const encoded = encodeURIComponent(current)
  return `/${locale}/login?redirect=${encoded}&returnTo=${encoded}`
}

export function SessionExpiredModal() {
  const { expired, dismiss } = useSessionExpiration()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [remaining, setRemaining] = useState(COUNTDOWN_SECONDS)

  useEffect(() => {
    if (!expired) {
      setRemaining(COUNTDOWN_SECONDS)
      return
    }
    const interval = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(interval)
          dismiss()
          router.push(buildLoginRedirect(pathname, searchParams?.toString() ?? ''))
          return 0
        }
        return r - 1
      })
    }, 1_000)
    return () => clearInterval(interval)
  }, [expired, router, pathname, searchParams, dismiss])

  const goToLogin = () => {
    dismiss()
    router.push(buildLoginRedirect(pathname, searchParams?.toString() ?? ''))
  }

  const saveDraft = () => {
    saveDraftSnapshot()
  }

  return (
    <Dialog.Root open={expired} onOpenChange={(o) => !o && dismiss()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-[90%] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-background p-6 shadow-lg"
          data-testid="session-expired-modal"
        >
          <Dialog.Title className="text-lg font-semibold">Sessão expirada</Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-muted-foreground">
            Sua sessão expirou por inatividade. Você pode salvar o rascunho local
            antes de fazer login novamente. Redirecionando em{' '}
            <span className="font-semibold text-foreground">{remaining}s</span>.
          </Dialog.Description>
          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={saveDraft}
              className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted"
              data-testid="session-save-draft"
            >
              Salvar rascunho aqui
            </button>
            <button
              type="button"
              onClick={goToLogin}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              data-testid="session-login-btn"
            >
              Login
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
