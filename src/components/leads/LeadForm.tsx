'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle } from 'lucide-react'
import { z } from 'zod'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'

const CHANNEL_OPTIONS = [
  { value: '', label: 'Selecione o canal' },
  { value: 'BLOG', label: 'Blog' },
  { value: 'LINKEDIN', label: 'LinkedIn' },
  { value: 'INSTAGRAM', label: 'Instagram' },
]

const FUNNEL_OPTIONS = [
  { value: '', label: 'Selecione o estágio' },
  { value: 'AWARENESS', label: 'Descoberta' },
  { value: 'CONSIDERATION', label: 'Consideração' },
  { value: 'DECISION', label: 'Decisão' },
]

const LeadFormSchema = z.object({
  company: z.string().min(1, 'Empresa é obrigatório').max(255),
  contactInfo: z.string().min(1, 'Informações de contato é obrigatório'),
  channel: z.enum(['BLOG', 'LINKEDIN', 'INSTAGRAM'], {
    errorMap: () => ({ message: 'Selecione um canal' }),
  }),
  funnelStage: z.enum(['AWARENESS', 'CONSIDERATION', 'DECISION'], {
    errorMap: () => ({ message: 'Selecione um estágio' }),
  }),
  firstTouchAt: z.string().min(1, 'Data de primeiro contato é obrigatória'),
  lgpdConsent: z.literal(true, {
    errorMap: () => ({ message: 'Consentimento LGPD é obrigatório' }),
  }),
})

type LeadFormData = z.infer<typeof LeadFormSchema>

interface LeadFormProps {
  locale: string
  onSuccess?: () => void
  defaultValues?: Partial<LeadFormData>
  themeId?: string
  postId?: string
}

export function LeadForm({ locale, onSuccess, defaultValues, themeId, postId }: LeadFormProps) {
  const router = useRouter()

  const [form, setForm] = useState({
    company: defaultValues?.company ?? '',
    contactInfo: defaultValues?.contactInfo ?? '',
    channel: defaultValues?.channel ?? '',
    funnelStage: defaultValues?.funnelStage ?? '',
    firstTouchAt: defaultValues?.firstTouchAt ?? new Date().toISOString().split('T')[0],
    lgpdConsent: false,
  })
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  function updateField(key: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[key]
        return next
      })
    }
  }

  function validate(): boolean {
    const result = LeadFormSchema.safeParse(form)
    if (result.success) {
      setErrors({})
      return true
    }

    const fieldErrors: Record<string, string> = {}
    for (const issue of result.error.issues) {
      const key = issue.path[0] as string
      if (!fieldErrors[key]) {
        fieldErrors[key] = issue.message
      }
    }
    setErrors(fieldErrors)
    return false
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    setIsSubmitting(true)

    try {
      const payload = {
        company: form.company.trim(),
        contactInfo: form.contactInfo.trim(),
        channel: form.channel,
        funnelStage: form.funnelStage,
        firstTouchAt: new Date(form.firstTouchAt).toISOString(),
        lgpdConsent: form.lgpdConsent,
        lgpdConsentAt: new Date().toISOString(),
        firstTouchThemeId: themeId ?? '00000000-0000-0000-0000-000000000000',
        firstTouchPostId: postId ?? '00000000-0000-0000-0000-000000000000',
      }

      const res = await fetch('/api/v1/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error ?? 'Erro ao registrar lead')
      }

      toast.success('Lead registrado com sucesso')

      if (onSuccess) {
        onSuccess()
      } else {
        router.push(`/${locale}/leads`)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro inesperado ao registrar lead')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} data-testid="lead-form" className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-4">
        <Input
          label="Empresa"
          placeholder="Nome da empresa"
          value={form.company}
          onChange={(e) => updateField('company', e.target.value)}
          error={errors.company}
          data-testid="lead-field-company"
        />

        <Select
          label="Canal"
          options={CHANNEL_OPTIONS}
          value={form.channel}
          onChange={(e) => updateField('channel', e.target.value)}
          error={errors.channel}
          data-testid="lead-field-channel"
        />

        <div className="flex flex-col gap-1">
          <Label htmlFor="lead-contactInfo">Informações de Contato</Label>
          <textarea
            id="lead-contactInfo"
            className={`flex min-h-[100px] w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-[150ms] ${
              errors.contactInfo
                ? 'border-danger bg-danger/5 focus-visible:ring-danger'
                : 'border-input hover:border-foreground/30'
            }`}
            placeholder="Email, telefone ou WhatsApp"
            value={form.contactInfo}
            onChange={(e) => updateField('contactInfo', e.target.value)}
            aria-invalid={errors.contactInfo ? 'true' : undefined}
            aria-describedby={errors.contactInfo ? 'contactInfo-error' : undefined}
            data-testid="lead-field-contactInfo"
          />
          {errors.contactInfo && (
            <p
              id="contactInfo-error"
              role="alert"
              className="flex items-center gap-1 text-xs text-danger"
            >
              <AlertCircle className="h-3 w-3 shrink-0" aria-hidden />
              {errors.contactInfo}
            </p>
          )}
        </div>

        <Select
          label="Estágio do Funil"
          options={FUNNEL_OPTIONS}
          value={form.funnelStage}
          onChange={(e) => updateField('funnelStage', e.target.value)}
          error={errors.funnelStage}
          data-testid="lead-field-funnelStage"
        />

        <Input
          label="Data do Primeiro Contato"
          type="date"
          value={form.firstTouchAt}
          onChange={(e) => updateField('firstTouchAt', e.target.value)}
          error={errors.firstTouchAt}
          data-testid="lead-field-firstTouchAt"
        />
      </div>

      {/* LGPD Consent */}
      <div className="rounded-md border border-border bg-muted/30 p-4">
        <div className="flex items-start gap-3">
          <Checkbox
            id="lgpd-consent"
            checked={form.lgpdConsent}
            onCheckedChange={(checked) => updateField('lgpdConsent', checked === true)}
            aria-describedby={errors.lgpdConsent ? 'lgpd-consent-error' : undefined}
            data-testid="lead-field-lgpdConsent"
          />
          <div className="flex-1">
            <label htmlFor="lgpd-consent" className="cursor-pointer text-sm text-foreground leading-relaxed">
              Confirmo que obtive consentimento explícito para armazenar estas informações de contato (LGPD)
            </label>
            {errors.lgpdConsent && (
              <p
                id="lgpd-consent-error"
                role="alert"
                className="mt-1 flex items-center gap-1 text-xs text-danger"
              >
                <AlertCircle className="h-3 w-3 shrink-0" aria-hidden />
                {errors.lgpdConsent}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col-reverse gap-3 border-t border-border pt-4 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(`/${locale}/leads`)}
          disabled={isSubmitting}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={!form.lgpdConsent || isSubmitting}
          isLoading={isSubmitting}
          loadingText="Registrando..."
          data-testid="lead-submit"
        >
          Registrar Lead
        </Button>
      </div>
    </form>
  )
}
