'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface ProfileFormProps {
  initial: { name: string; email: string }
}

export function ProfileForm({ initial }: ProfileFormProps) {
  const t = useTranslations('settings.profile')
  const [name, setName] = useState(initial.name)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function save() {
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch('/api/v1/profile', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const j = await res.json()
      setMessage(j.success ? t('saved') : j.error ?? 'Erro ao salvar.')
    } catch {
      setMessage('Erro ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="name">{t('name')}</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">{t('email')}</Label>
        <Input id="email" value={initial.email} disabled />
      </div>
      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={saving || !name.trim()}>
          {saving ? 'Salvando...' : t('save')}
        </Button>
        {message && <span className="text-xs text-muted-foreground">{message}</span>}
      </div>
    </div>
  )
}
