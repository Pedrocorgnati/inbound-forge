'use client'

/**
 * loop 05-27 TAREFA-028 (P3): painel de MFA/TOTP opt-in em /settings/account.
 *
 * Fluxo de ativacao: status -> (Ativar) -> QR + secret -> verificar codigo de 6
 * digitos -> exibir backup codes (uma unica vez) -> ativo.
 * Fluxo de desativacao: confirmar com codigo TOTP.
 *
 * O segredo TOTP e gerido pelo Supabase Auth; este componente apenas orquestra
 * os endpoints /api/v1/auth/mfa/{setup,verify,disable}. Todos os estados
 * (loading/empty/error/success) sao renderizaveis (Zero Estados Indefinidos) e
 * toda acao tem feedback explicito (Zero Silencio).
 */
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'

type Status = 'loading' | 'error' | 'disabled' | 'enrolling' | 'showing-codes' | 'enabled'

interface StatusResponse {
  success: boolean
  data?: { enabled: boolean; backupCodesRemaining: number }
}

interface SetupResponse {
  success: boolean
  data?: { factorId: string; qrCode: string; secret: string; uri: string }
}

interface VerifyResponse {
  success: boolean
  data?: { enabled: boolean; backupCodes: string[] }
}

const ERROR_COPY: Record<string, string> = {
  MFA_ALREADY_ENABLED: 'O MFA ja esta ativo nesta conta.',
  MFA_NOT_ENABLED: 'O MFA nao esta ativo.',
  INVALID_CODE: 'Codigo invalido. Verifique o app autenticador e tente de novo.',
  CHALLENGE_FAILED: 'Nao foi possivel iniciar a verificacao. Tente novamente.',
  RATE_LIMITED: 'Muitas tentativas. Aguarde alguns minutos.',
}

function describeError(code: string | undefined, status: number): string {
  if (code && ERROR_COPY[code]) return ERROR_COPY[code]
  if (status === 429) return ERROR_COPY.RATE_LIMITED
  return `Falha (${status}). Tente novamente.`
}

export function MFAPanel() {
  const [status, setStatus] = useState<Status>('loading')
  const [remaining, setRemaining] = useState(0)
  const [factorId, setFactorId] = useState('')
  const [qrCode, setQrCode] = useState('')
  const [secret, setSecret] = useState('')
  const [code, setCode] = useState('')
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [busy, setBusy] = useState(false)

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/auth/mfa/setup', { method: 'GET' })
      if (!res.ok) {
        setStatus('error')
        return
      }
      const json = (await res.json()) as StatusResponse
      if (!json.data) {
        setStatus('error')
        return
      }
      setRemaining(json.data.backupCodesRemaining)
      setStatus(json.data.enabled ? 'enabled' : 'disabled')
    } catch {
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    void loadStatus()
  }, [loadStatus])

  async function startEnroll() {
    setBusy(true)
    try {
      const res = await fetch('/api/v1/auth/mfa/setup', { method: 'POST' })
      const json = (await res.json().catch(() => ({}))) as SetupResponse & { error?: string }
      if (!res.ok || !json.data) {
        toast.error(describeError(json.error, res.status))
        return
      }
      setFactorId(json.data.factorId)
      setQrCode(json.data.qrCode)
      setSecret(json.data.secret)
      setCode('')
      setStatus('enrolling')
    } catch {
      toast.error('Falha de rede ao iniciar o MFA.')
    } finally {
      setBusy(false)
    }
  }

  // fix REPROVADO (finding TASK-028): cancelar o enroll remove o fator unverified
  // orfao no Supabase (DELETE /setup, best-effort) em vez de so trocar de tela.
  async function cancelEnroll() {
    setBusy(true)
    try {
      await fetch('/api/v1/auth/mfa/setup', { method: 'DELETE' }).catch(() => undefined)
    } finally {
      setBusy(false)
      setCode('')
      setFactorId('')
      setStatus('disabled')
    }
  }

  async function confirmEnroll() {
    if (!/^[0-9]{6}$/.test(code)) {
      toast.error('Digite os 6 digitos do app autenticador.')
      return
    }
    setBusy(true)
    try {
      const res = await fetch('/api/v1/auth/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ factorId, code }),
      })
      const json = (await res.json().catch(() => ({}))) as VerifyResponse & { error?: string }
      if (!res.ok || !json.data) {
        toast.error(describeError(json.error, res.status))
        return
      }
      setBackupCodes(json.data.backupCodes)
      setRemaining(json.data.backupCodes.length)
      setStatus('showing-codes')
      toast.success('MFA ativado. Guarde seus backup codes.')
    } catch {
      toast.error('Falha de rede ao verificar o codigo.')
    } finally {
      setBusy(false)
    }
  }

  async function disable() {
    if (!/^[0-9]{6}$/.test(code)) {
      toast.error('Digite os 6 digitos para confirmar a desativacao.')
      return
    }
    setBusy(true)
    try {
      const res = await fetch('/api/v1/auth/mfa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const json = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string }
      if (!res.ok) {
        toast.error(describeError(json.error, res.status))
        return
      }
      toast.success('MFA desativado.')
      setCode('')
      setBackupCodes([])
      setStatus('disabled')
    } catch {
      toast.error('Falha de rede ao desativar o MFA.')
    } finally {
      setBusy(false)
    }
  }

  function copyBackupCodes() {
    void navigator.clipboard
      ?.writeText(backupCodes.join('\n'))
      .then(() => toast.success('Backup codes copiados.'))
      .catch(() => toast.error('Nao foi possivel copiar.'))
  }

  const inputClass =
    'mt-1 w-40 rounded-md border border-border bg-background px-3 py-2 text-center text-lg tracking-widest'

  // ── Estados renderizaveis ────────────────────────────────────────────────
  if (status === 'loading') {
    return <p className="text-sm text-muted-foreground">Carregando status do MFA...</p>
  }

  if (status === 'error') {
    return (
      <div className="space-y-3">
        <p className="text-sm text-destructive">
          Nao foi possivel carregar o status do MFA.
        </p>
        <button
          type="button"
          onClick={() => {
            setStatus('loading')
            void loadStatus()
          }}
          className="rounded-md border border-border px-3 py-2 text-sm"
        >
          Tentar novamente
        </button>
      </div>
    )
  }

  if (status === 'disabled') {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          A verificacao em duas etapas (TOTP) esta desativada. Ative para exigir um
          codigo do seu app autenticador a cada login.
        </p>
        <button
          type="button"
          onClick={startEnroll}
          disabled={busy}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {busy ? 'Preparando...' : 'Ativar verificacao em duas etapas'}
        </button>
      </div>
    )
  }

  if (status === 'enrolling') {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Escaneie o QR code com Google Authenticator, 1Password ou similar. Se nao
          puder escanear, use a chave manual abaixo.
        </p>
        {qrCode && (
          <div
            className="inline-block rounded-md border border-border bg-white p-2"
            // qr_code e um SVG gerado pelo Supabase (fonte confiavel)
            dangerouslySetInnerHTML={{ __html: qrCode }}
          />
        )}
        <div>
          <span className="text-xs font-medium text-muted-foreground">Chave manual</span>
          <code className="mt-1 block break-all rounded-md bg-muted px-3 py-2 text-sm">
            {secret}
          </code>
        </div>
        <div>
          <label htmlFor="mfa-code" className="text-sm font-medium">
            Codigo de 6 digitos
          </label>
          <input
            id="mfa-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            className={inputClass}
          />
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={confirmEnroll}
            disabled={busy}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {busy ? 'Verificando...' : 'Verificar e ativar'}
          </button>
          <button
            type="button"
            onClick={cancelEnroll}
            disabled={busy}
            className="rounded-md border border-border px-4 py-2 text-sm"
          >
            Cancelar
          </button>
        </div>
      </div>
    )
  }

  if (status === 'showing-codes') {
    return (
      <div className="space-y-4">
        <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3">
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
            MFA ativado.
          </p>
          <p className="text-sm text-muted-foreground">
            Guarde estes backup codes em local seguro. Cada um funciona uma unica vez
            para recuperar o acesso se voce perder o autenticador. Eles nao serao
            exibidos novamente.
          </p>
        </div>
        <ul className="grid grid-cols-2 gap-2">
          {backupCodes.map((c) => (
            <li
              key={c}
              className="rounded-md bg-muted px-3 py-2 text-center font-mono text-sm tracking-widest"
            >
              {c}
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={copyBackupCodes}
            className="rounded-md border border-border px-4 py-2 text-sm"
          >
            Copiar codes
          </button>
          <button
            type="button"
            onClick={() => {
              setBackupCodes([])
              // fix REPROVADO (finding TASK-028): limpar o codigo TOTP ao concluir,
              // para nao vazar o valor digitado no enroll para o form de desativacao.
              setCode('')
              setStatus('enabled')
            }}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Ja guardei, concluir
          </button>
        </div>
      </div>
    )
  }

  // status === 'enabled'
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
        <p className="text-sm font-medium">Verificacao em duas etapas ativa</p>
      </div>
      <p className="text-sm text-muted-foreground">
        Backup codes restantes: <strong>{remaining}</strong>. Para desativar, confirme
        com um codigo do seu app autenticador.
      </p>
      <div>
        <label htmlFor="mfa-disable-code" className="text-sm font-medium">
          Codigo de 6 digitos
        </label>
        <input
          id="mfa-disable-code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          className={inputClass}
        />
      </div>
      <button
        type="button"
        onClick={disable}
        disabled={busy}
        className="rounded-md border border-destructive px-4 py-2 text-sm font-medium text-destructive disabled:opacity-50"
      >
        {busy ? 'Desativando...' : 'Desativar MFA'}
      </button>
    </div>
  )
}
