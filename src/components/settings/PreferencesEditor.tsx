'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Select } from '@/components/ui/select'

interface Preferences {
  language: 'pt-BR' | 'en-US' | 'it-IT' | 'es-ES'
  darkMode: boolean
  emailNotifications: boolean
  degradedMode: boolean
}

const DEFAULTS: Preferences = {
  language: 'pt-BR',
  darkMode: false,
  emailNotifications: true,
  degradedMode: false,
}

export function PreferencesEditor() {
  const t = useTranslations('settings.preferences')
  const [prefs, setPrefs] = useState<Preferences>(DEFAULTS)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/v1/settings/preferences')
      .then((r) => r.json())
      .then((j) => {
        if (j.success && j.data) setPrefs({ ...DEFAULTS, ...j.data })
      })
      .catch(() => {})
  }, [])

  async function save() {
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch('/api/v1/settings/preferences', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(prefs),
      })
      const j = await res.json()
      setMessage(j.success ? 'Preferências salvas.' : j.error ?? 'Erro ao salvar.')
    } catch {
      setMessage('Erro ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-md">
      <div className="space-y-2">
        <Select
          id="lang"
          label={t('language')}
          value={prefs.language}
          onChange={(e) =>
            setPrefs((p) => ({ ...p, language: e.target.value as Preferences['language'] }))
          }
          options={[
            { value: 'pt-BR', label: 'Português (BR)' },
            { value: 'en-US', label: 'English (US)' },
            { value: 'it-IT', label: 'Italiano' },
            { value: 'es-ES', label: 'Español' },
          ]}
        />
      </div>

      <label className="flex items-center gap-3">
        <Checkbox
          checked={prefs.darkMode}
          onCheckedChange={(v) => setPrefs((p) => ({ ...p, darkMode: Boolean(v) }))}
        />
        <span className="text-sm">{t('darkMode')}</span>
      </label>

      <label className="flex items-center gap-3">
        <Checkbox
          checked={prefs.emailNotifications}
          onCheckedChange={(v) => setPrefs((p) => ({ ...p, emailNotifications: Boolean(v) }))}
        />
        <span className="text-sm">{t('emailNotifications')}</span>
      </label>

      <label className="flex items-center gap-3">
        <Checkbox
          checked={prefs.degradedMode}
          onCheckedChange={(v) => setPrefs((p) => ({ ...p, degradedMode: Boolean(v) }))}
        />
        <span className="text-sm">{t('degradedMode')}</span>
      </label>

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar preferências'}
        </Button>
        {message && <span className="text-xs text-muted-foreground">{message}</span>}
      </div>
    </div>
  )
}
