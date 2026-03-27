'use client'

import { useState, useRef } from 'react'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { toast } from '@/components/ui/toast'

type TestStatus = 'idle' | 'testing' | 'ok' | 'error'

interface CredentialTestCardProps {
  service: string
  serviceKey: string
  label: string
  placeholder?: string
  onResult: (success: boolean) => void
}

/** SEC-012: mask all but last 4 chars when blurred */
function maskValue(val: string): string {
  if (val.length <= 4) return val
  return '\u25CF'.repeat(Math.min(val.length - 4, 20)) + val.slice(-4)
}

export function CredentialTestCard({
  service,
  serviceKey,
  label,
  placeholder,
  onResult,
}: CredentialTestCardProps) {
  const [value, setValue] = useState('')
  const [status, setStatus] = useState<TestStatus>('idle')
  const [masked, setMasked] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleTest() {
    if (!value.trim()) {
      toast.error('Insira a credencial antes de testar')
      return
    }

    setStatus('testing')
    setErrorMsg(null)

    try {
      const res = await fetch('/api/v1/credentials/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service: serviceKey, key: value.trim() }),
      })

      const data = await res.json() as { ok: boolean; latency: number; error?: string }

      if (data.ok) {
        setStatus('ok')
        toast.success(`${label}: conexao OK (${data.latency}ms)`)
        onResult(true)
      } else {
        setStatus('error')
        setErrorMsg(data.error ?? 'Credencial invalida')
        toast.error(`${label}: falha na verificacao`)
        onResult(false)
      }
    } catch {
      setStatus('error')
      setErrorMsg('Erro de rede ao testar')
      toast.error('Erro de rede ao testar credencial')
      onResult(false)
    }
  }

  return (
    <div
      data-testid={`credential-card-${service}`}
      className={cn(
        'rounded-lg border p-4 transition-colors',
        status === 'ok' && 'border-green-500/50 bg-green-500/5',
        status === 'error' && 'border-danger/50 bg-danger/5',
        status === 'idle' && 'border-border',
        status === 'testing' && 'border-primary/50'
      )}
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">{label}</Label>
          {status === 'ok' && (
            <CheckCircle2 className="h-4 w-4 text-green-500" aria-label="Verificado" />
          )}
          {status === 'error' && (
            <XCircle className="h-4 w-4 text-danger" aria-label="Erro" />
          )}
        </div>

        <div className="flex gap-2">
          <input
            ref={inputRef}
            data-testid={`credential-input-${service}`}
            type={masked ? 'text' : 'password'}
            value={masked ? maskValue(value) : value}
            onChange={(e) => {
              if (masked) setMasked(false)
              setValue(e.target.value)
              if (status !== 'idle') setStatus('idle')
            }}
            onFocus={() => {
              if (masked) setMasked(false)
            }}
            onBlur={() => {
              if (value.length > 0) setMasked(true)
            }}
            placeholder={placeholder ?? `Insira ${label}`}
            className={cn(
              'flex min-h-[44px] w-full rounded-md border bg-background px-3 py-2 text-sm font-mono',
              'placeholder:text-muted-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0',
              'disabled:cursor-not-allowed disabled:opacity-50',
              'transition-colors duration-[150ms]',
              'border-input hover:border-foreground/30'
            )}
            disabled={status === 'testing'}
            autoComplete="off"
          />

          <Button
            data-testid={`credential-test-btn-${service}`}
            variant="outline"
            size="md"
            onClick={handleTest}
            disabled={status === 'testing' || !value.trim()}
            className="shrink-0"
          >
            {status === 'testing' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Testar'
            )}
          </Button>
        </div>

        {errorMsg && (
          <p className="text-xs text-danger" role="alert">
            {errorMsg}
          </p>
        )}
      </div>
    </div>
  )
}
