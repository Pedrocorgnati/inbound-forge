'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Eye, EyeOff, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ConfirmReplaceKeyModal } from './ConfirmReplaceKeyModal'
import type { CredentialProvider } from '@/constants/settings'

interface ApiKeyFormProps {
  provider: CredentialProvider
  label: string
  envVar: string
  masked: string | null
  configured: boolean
  onSaved?: () => void
}

type TestState = 'idle' | 'testing' | 'ok' | 'fail'

export function ApiKeyForm({
  provider,
  label,
  envVar,
  masked,
  configured,
  onSaved,
}: ApiKeyFormProps) {
  const t = useTranslations('settings.api')
  const [value, setValue] = useState('')
  const [show, setShow] = useState(false)
  const [testState, setTestState] = useState<TestState>('idle')
  const [saving, setSaving] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function handleTest() {
    if (!value) return
    setTestState('testing')
    setMessage(null)
    try {
      const res = await fetch('/api/v1/credentials/test', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ service: provider, key: value }),
      })
      const json = await res.json()
      setTestState(json.ok ? 'ok' : 'fail')
      setMessage(json.ok ? t('testSuccess') : t('testFail'))
    } catch {
      setTestState('fail')
      setMessage(t('testFail'))
    }
  }

  function handleSaveClick() {
    if (!value) return
    if (configured) {
      setConfirmOpen(true)
    } else {
      doSave()
    }
  }

  async function doSave() {
    setConfirmOpen(false)
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch('/api/v1/credentials', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ provider, key: value }),
      })
      const json = await res.json()
      if (json.success) {
        setMessage(t('saved'))
        setValue('')
        setTestState('idle')
        onSaved?.()
      } else {
        setMessage(json.error ?? t('testFail'))
      }
    } catch {
      setMessage(t('testFail'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">{label}</h3>
          <p className="text-xs text-muted-foreground">{envVar}</p>
        </div>
        <Badge variant={configured ? 'success' : 'warning'}>
          {configured ? t('configured') : t('notConfigured')}
        </Badge>
      </div>

      {configured && masked && (
        <p className="text-xs text-muted-foreground font-mono">
          {t('masked')} <span>{masked}</span>
        </p>
      )}

      <div className="space-y-2">
        <Label htmlFor={`key-${provider}`}>
          {configured ? t('replaceKey') : t('newKey')}
        </Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              id={`key-${provider}`}
              type={show ? 'text' : 'password'}
              value={value}
              onChange={(e) => {
                setValue(e.target.value)
                setTestState('idle')
              }}
              autoComplete="off"
              spellCheck={false}
              className="pr-10 font-mono"
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              aria-label={show ? 'Ocultar chave' : 'Mostrar chave'}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleTest}
          disabled={!value || testState === 'testing'}
        >
          {testState === 'testing' ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              {t('testing')}
            </>
          ) : (
            t('test')
          )}
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={handleSaveClick}
          disabled={!value || saving || testState === 'fail'}
        >
          {saving ? t('saving') : t('save')}
        </Button>
      </div>

      {message && (
        <p
          role="status"
          className={cn(
            'text-xs flex items-center gap-2',
            testState === 'ok' && 'text-green-600',
            testState === 'fail' && 'text-red-600'
          )}
        >
          {testState === 'ok' && <CheckCircle2 className="h-4 w-4" />}
          {testState === 'fail' && <AlertCircle className="h-4 w-4" />}
          {message}
        </p>
      )}

      <ConfirmReplaceKeyModal
        open={confirmOpen}
        providerLabel={label}
        onConfirm={doSave}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  )
}
