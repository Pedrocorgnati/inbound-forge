'use client'

import * as React from 'react'
import Link from 'next/link'
import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle2, ShieldCheck } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { uuidv7 } from '@/lib/utils/uuidv7'

const formSchema = z.object({
  name: z.string().trim().min(2, 'Informe seu nome').max(120),
  company: z.string().trim().min(2, 'Informe a empresa').max(160),
  email: z.string().trim().email('Informe um email valido').max(254),
  phone: z.string().trim().regex(/^\+?[\d\s().-]{10,20}$/, 'Informe um telefone valido'),
  segment: z.string().trim().min(2, 'Informe o segmento').max(120),
  pain: z.string().trim().min(20, 'Descreva a dor com pelo menos 20 caracteres').max(1200),
  lgpdConsent: z.boolean().refine((value) => value === true, {
    message: 'O consentimento LGPD e obrigatorio',
  }),
  retentionAccepted: z.boolean().refine((value) => value === true, {
    message: 'Confirme a politica de retencao',
  }),
  website: z.string().max(0).optional(),
})

type FormValues = z.infer<typeof formSchema>

type ApiSuccess = {
  success: true
  data: {
    correlation_id: string
    raw_text_retention_seconds: number
  }
}

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value)
  const hash = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

async function solveProofOfWork(): Promise<{ nonce: string; answer: number }> {
  const nonceBytes = crypto.getRandomValues(new Uint8Array(16))
  const nonce = Array.from(nonceBytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')

  for (let answer = 0; answer <= 20_000_000; answer += 1) {
    const digest = await sha256(`diagnostico:${nonce}:${answer}`)
    if (digest.startsWith('000')) return { nonce, answer }
  }

  throw new Error('Nao foi possivel concluir a validacao anti-spam')
}

export function DiagnosticoForm({ locale }: { locale: string }) {
  const [serverError, setServerError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState<ApiSuccess['data'] | null>(null)
  const [isSolvingPow, setIsSolvingPow] = React.useState(false)
  // Idempotency-Key estavel por submissao: a rota /api/v1/diagnostico embrulha o
  // handler em withIdempotency e responde 400 sem este header. Mantemos a mesma
  // chave entre retries da MESMA tentativa (double-click, reenvio apos erro) para
  // que o funil dedupe de verdade; apos sucesso, zeramos para a proxima ser um
  // lead novo com chave nova.
  const idempotencyKeyRef = React.useRef<string | null>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      company: '',
      email: '',
      phone: '',
      segment: '',
      pain: '',
      lgpdConsent: false,
      retentionAccepted: false,
      website: '',
    },
  })

  async function onSubmit(values: FormValues) {
    setServerError(null)
    setSuccess(null)
    setIsSolvingPow(true)

    try {
      const pow = await solveProofOfWork()
      if (!idempotencyKeyRef.current) idempotencyKeyRef.current = uuidv7()
      const response = await fetch('/api/v1/diagnostico', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKeyRef.current,
        },
        body: JSON.stringify({ ...values, pow }),
      })
      const payload = await response.json()

      if (!response.ok || !payload.success) {
        setServerError(payload.message ?? 'Nao foi possivel enviar o diagnostico.')
        return
      }

      setSuccess((payload as ApiSuccess).data)
      idempotencyKeyRef.current = null
      form.reset()
    } catch (error) {
      setServerError(error instanceof Error ? error.message : 'Falha inesperada no envio.')
    } finally {
      setIsSolvingPow(false)
    }
  }

  const isSubmitting = form.formState.isSubmitting || isSolvingPow

  if (success) {
    return (
      <section className="rounded-lg border border-border bg-surface-raised p-6 shadow-card">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-success" aria-hidden />
          <div>
            <h2 className="text-xl font-semibold text-foreground">Diagnostico recebido</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Guarde o codigo abaixo para suporte e acompanhamento.
            </p>
            <code className="mt-4 block rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground">
              {success.correlation_id}
            </code>
            <p className="mt-4 text-xs text-muted-foreground">
              Texto bruto retido por {success.raw_text_retention_seconds / 60} minutos.
            </p>
            <Button className="mt-6" type="button" onClick={() => setSuccess(null)}>
              Enviar outro diagnostico
            </Button>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="rounded-lg border border-border bg-surface-raised p-5 shadow-card sm:p-6">
      <div className="mb-5 flex items-start gap-3">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
        <div>
          <h2 className="text-xl font-semibold text-foreground">Formulario publico</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Campos com dados pessoais sao criptografados antes de persistir.
          </p>
        </div>
      </div>

      <form className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <input
          type="text"
          tabIndex={-1}
          autoComplete="off"
          className="hidden"
          aria-hidden="true"
          {...form.register('website')}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Nome" autoComplete="name" error={form.formState.errors.name?.message} {...form.register('name')} />
          <Input label="Empresa" autoComplete="organization" error={form.formState.errors.company?.message} {...form.register('company')} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Email" type="email" autoComplete="email" error={form.formState.errors.email?.message} {...form.register('email')} />
          <Input label="Telefone" type="tel" autoComplete="tel" error={form.formState.errors.phone?.message} {...form.register('phone')} />
        </div>

        <Input
          label="Segmento"
          placeholder="Ex.: clinica, escritorio, distribuidora"
          error={form.formState.errors.segment?.message}
          {...form.register('segment')}
        />

        <Textarea
          label="Dor declarada"
          placeholder="Descreva o processo que trava, o impacto e a urgencia."
          rows={6}
          error={form.formState.errors.pain?.message}
          helperText={`${form.watch('pain')?.length ?? 0}/1200 caracteres`}
          {...form.register('pain')}
        />

        <div className="space-y-3 rounded-md border border-border bg-background p-4">
          <Checkbox
            id="lgpdConsent"
            checked={form.watch('lgpdConsent')}
            onCheckedChange={(checked) => form.setValue('lgpdConsent', checked === true, { shouldValidate: true })}
            label="Autorizo o tratamento dos dados informados para contato e diagnostico inicial."
          />
          {form.formState.errors.lgpdConsent && (
            <p className="text-xs text-danger">{form.formState.errors.lgpdConsent.message}</p>
          )}

          <Checkbox
            id="retentionAccepted"
            checked={form.watch('retentionAccepted')}
            onCheckedChange={(checked) => form.setValue('retentionAccepted', checked === true, { shouldValidate: true })}
            label="Estou ciente de que o texto bruto sera retido por 1 hora e os dados de contato ficam criptografados."
          />
          {form.formState.errors.retentionAccepted && (
            <p className="text-xs text-danger">{form.formState.errors.retentionAccepted.message}</p>
          )}

          <p className="text-xs leading-5 text-muted-foreground">
            Consulte a{' '}
            <Link className="text-primary underline underline-offset-2" href={`/${locale}/privacy`}>
              politica de privacidade
            </Link>
            .
          </p>
        </div>

        {serverError && (
          <p role="alert" className="rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
            {serverError}
          </p>
        )}

        <Button type="submit" isLoading={isSubmitting} loadingText="Validando e enviando">
          Enviar diagnostico
        </Button>
      </form>
    </section>
  )
}
