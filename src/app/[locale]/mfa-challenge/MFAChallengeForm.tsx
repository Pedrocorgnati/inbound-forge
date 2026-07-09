'use client'

/**
 * loop 05-27 TAREFA-028 (P3): formulario de desafio TOTP no login.
 *
 * A sessao ja existe em AAL1; este passo eleva para AAL2 verificando um codigo
 * TOTP (POST /api/v1/auth/mfa/challenge). Caminho de recovery: usar um backup
 * code (POST /api/v1/auth/mfa/disable { backupCode }), que desativa o MFA e
 * libera o acesso para re-enrolar depois.
 */
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

const ERROR_COPY: Record<string, string> = {
  INVALID_CODE: 'Codigo invalido. Tente novamente.',
  INVALID_BACKUP_CODE: 'Backup code invalido ou ja utilizado.',
  CHALLENGE_FAILED: 'Nao foi possivel iniciar a verificacao.',
  MFA_NOT_ENABLED: 'MFA nao esta ativo nesta conta.',
  RATE_LIMITED: 'Muitas tentativas. Aguarde alguns minutos.',
}

function describe(code: string | undefined, status: number): string {
  if (code && ERROR_COPY[code]) return ERROR_COPY[code]
  if (status === 429) return ERROR_COPY.RATE_LIMITED
  return `Falha (${status}). Tente novamente.`
}

export function MFAChallengeForm({ redirectTo }: { redirectTo: string }) {
  const router = useRouter()
  const tToast = useTranslations('toasts')
  const [mode, setMode] = useState<'totp' | 'recovery'>('totp')
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit() {
    setBusy(true)
    try {
      if (mode === 'totp') {
        if (!/^[0-9]{6}$/.test(value)) {
          toast.error(tToast('mfa.enter_6_digits'))
          return
        }
        const res = await fetch('/api/v1/auth/mfa/challenge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: value }),
        })
        const json = (await res.json().catch(() => ({}))) as { error?: string }
        if (!res.ok) {
          toast.error(describe(json.error, res.status))
          return
        }
        router.replace(redirectTo)
        router.refresh()
      } else {
        if (value.replace(/[^A-Za-z0-9]/g, '').length < 8) {
          toast.error(tToast('mfa.invalid_backup_code'))
          return
        }
        const res = await fetch('/api/v1/auth/mfa/disable', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ backupCode: value }),
        })
        const json = (await res.json().catch(() => ({}))) as { error?: string }
        if (!res.ok) {
          toast.error(describe(json.error, res.status))
          return
        }
        toast.success(tToast('mfa.disabled_via_backup'))
        router.replace(redirectTo)
        router.refresh()
      }
    } catch {
      toast.error(tToast('common.network_retry'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="mfa-challenge-input" className="text-sm font-medium">
          {mode === 'totp' ? 'Codigo de 6 digitos' : 'Backup code'}
        </label>
        <input
          id="mfa-challenge-input"
          inputMode={mode === 'totp' ? 'numeric' : 'text'}
          autoComplete="one-time-code"
          value={value}
          onChange={(e) =>
            setValue(mode === 'totp' ? e.target.value.replace(/\D/g, '').slice(0, 6) : e.target.value)
          }
          onKeyDown={(e) => {
            if (e.key === 'Enter') void submit()
          }}
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-center text-lg tracking-widest"
        />
      </div>
      <button
        type="button"
        onClick={() => void submit()}
        disabled={busy}
        className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        {busy ? 'Verificando...' : mode === 'totp' ? 'Verificar' : 'Recuperar acesso'}
      </button>
      <button
        type="button"
        onClick={() => {
          setMode((m) => (m === 'totp' ? 'recovery' : 'totp'))
          setValue('')
        }}
        className="w-full text-center text-xs text-muted-foreground underline"
      >
        {mode === 'totp'
          ? 'Perdeu o autenticador? Usar um backup code'
          : 'Voltar para o codigo do autenticador'}
      </button>
    </div>
  )
}
