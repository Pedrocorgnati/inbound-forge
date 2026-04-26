'use client'

import { useState, useId, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { createPostSchema, type CreatePostInput } from '@/lib/validators/post'
import { PUBLISHING_CHANNELS } from '@/lib/constants/publishing'

interface PostFormProps {
  onSuccess?: () => void
}

type ChannelKey = keyof typeof PUBLISHING_CHANNELS

export function PostForm({ onSuccess }: PostFormProps) {
  const formId = useId()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm<CreatePostInput>({
    resolver: zodResolver(createPostSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: {
      channel: 'INSTAGRAM',
      caption: '',
      hashtags: [],
      ctaText: '',
      ctaUrl: '',
      imageUrl: '',
      scheduledAt: undefined,
    },
  })

  const selectedChannel = watch('channel') as ChannelKey
  const captionValue = watch('caption') ?? ''
  const channelConfig = PUBLISHING_CHANNELS[selectedChannel]
  const maxCaption = channelConfig?.maxCaptionLength ?? 2200
  const isOverLimit = captionValue.length > maxCaption

  async function onSubmit(data: CreatePostInput) {
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const body = await response.json().catch(() => null)
        const message = body?.error ?? 'Erro ao criar post'
        throw new Error(message)
      }

      toast.success('Post criado com sucesso!')
      reset()
      onSuccess?.()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro inesperado ao criar post'
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleImageUpload(file: File) {
    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('altText', file.name)

      const res = await fetch('/api/visual-assets', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error ?? 'Erro no upload')
      }

      const { data } = await res.json()
      setValue('imageUrl', data.url, { shouldValidate: true })
      toast.success('Imagem enviada com sucesso')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro no upload'
      toast.error(message)
    } finally {
      setIsUploading(false)
    }
  }

  const labelClasses = 'block text-sm font-medium text-foreground mb-1'
  const inputClasses =
    'w-full rounded-md border border-input bg-background px-3 py-2 text-base shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-muted disabled:text-muted-foreground'
  const errorClasses = 'mt-1 text-xs text-danger'

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-5"
      aria-label="Formulário de criação de post"
    >
      {/* Canal */}
      <div>
        <label htmlFor={`${formId}-channel`} className={labelClasses}>
          Canal
        </label>
        <select
          id={`${formId}-channel`}
          {...register('channel')}
          disabled={isSubmitting}
          aria-invalid={!!errors.channel}
          aria-describedby={errors.channel ? `${formId}-channel-error` : undefined}
          className={inputClasses}
        >
          {(Object.keys(PUBLISHING_CHANNELS) as ChannelKey[]).map((key) => (
            <option key={key} value={key}>
              {PUBLISHING_CHANNELS[key].label}
            </option>
          ))}
        </select>
        {errors.channel && (
          <p id={`${formId}-channel-error`} className={errorClasses} role="alert">
            {errors.channel.message}
          </p>
        )}
      </div>

      {/* Caption */}
      <div>
        <label htmlFor={`${formId}-caption`} className={labelClasses}>
          Caption
        </label>
        <textarea
          id={`${formId}-caption`}
          {...register('caption')}
          rows={4}
          disabled={isSubmitting}
          placeholder="Escreva a caption do post..."
          aria-invalid={!!errors.caption}
          aria-describedby={errors.caption ? `${formId}-caption-error` : `${formId}-caption-counter`}
          className={cn(inputClasses, 'resize-y')}
        />
        <div className="mt-1 flex items-center justify-between">
          {errors.caption ? (
            <p id={`${formId}-caption-error`} className={errorClasses} role="alert">
              {errors.caption.message}
            </p>
          ) : (
            <span />
          )}
          <span
            id={`${formId}-caption-counter`}
            className={cn('text-xs', isOverLimit ? 'text-danger font-medium' : 'text-muted-foreground')}
            aria-live="polite"
          >
            {captionValue.length}/{maxCaption}
          </span>
        </div>
      </div>

      {/* Hashtags */}
      <div>
        <label htmlFor={`${formId}-hashtags`} className={labelClasses}>
          Hashtags
        </label>
        <input
          id={`${formId}-hashtags`}
          type="text"
          disabled={isSubmitting}
          placeholder="#marketing, #inbound, #conteudo"
          aria-invalid={!!errors.hashtags}
          aria-describedby={errors.hashtags ? `${formId}-hashtags-error` : `${formId}-hashtags-hint`}
          className={inputClasses}
          {...register('hashtags', {
            setValueAs: (value: string) => {
              if (!value || typeof value !== 'string') return []
              return value
                .split(',')
                .map((tag) => tag.trim())
                .filter(Boolean)
            },
          })}
        />
        {errors.hashtags && (
          <p id={`${formId}-hashtags-error`} className={errorClasses} role="alert">
            {errors.hashtags.message}
          </p>
        )}
        <p id={`${formId}-hashtags-hint`} className="mt-1 text-xs text-muted-foreground">
          Separe as hashtags por virgula (max {channelConfig?.maxHashtags ?? 30})
        </p>
      </div>

      {/* Data de agendamento */}
      <div>
        <label htmlFor={`${formId}-scheduledAt`} className={labelClasses}>
          Agendar para (opcional)
        </label>
        <input
          id={`${formId}-scheduledAt`}
          type="datetime-local"
          {...register('scheduledAt')}
          disabled={isSubmitting}
          aria-invalid={!!errors.scheduledAt}
          aria-describedby={errors.scheduledAt ? `${formId}-scheduledAt-error` : undefined}
          className={inputClasses}
        />
        {errors.scheduledAt && (
          <p id={`${formId}-scheduledAt-error`} className={errorClasses} role="alert">
            {errors.scheduledAt.message}
          </p>
        )}
      </div>

      {/* Imagem */}
      <div>
        <label htmlFor={`${formId}-imageUrl`} className={labelClasses}>
          Imagem (opcional)
        </label>
        <div className="flex gap-2">
          <input
            id={`${formId}-imageUrl`}
            type="url"
            {...register('imageUrl')}
            disabled={isSubmitting || isUploading}
            placeholder="https://exemplo.com/imagem.jpg"
            aria-invalid={!!errors.imageUrl}
            aria-describedby={errors.imageUrl ? `${formId}-imageUrl-error` : undefined}
            className={cn(inputClasses, 'flex-1')}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleImageUpload(file)
              e.target.value = ''
            }}
          />
          <button
            type="button"
            disabled={isSubmitting || isUploading}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-2 text-sm',
              'hover:bg-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          >
            {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {isUploading ? 'Enviando...' : 'Upload'}
          </button>
        </div>
        {errors.imageUrl && (
          <p id={`${formId}-imageUrl-error`} className={errorClasses} role="alert">
            {errors.imageUrl.message}
          </p>
        )}
      </div>

      {/* CTA Text */}
      <div>
        <label htmlFor={`${formId}-ctaText`} className={labelClasses}>
          Texto do CTA (opcional)
        </label>
        <input
          id={`${formId}-ctaText`}
          type="text"
          {...register('ctaText')}
          disabled={isSubmitting}
          placeholder="Saiba mais"
          aria-invalid={!!errors.ctaText}
          aria-describedby={errors.ctaText ? `${formId}-ctaText-error` : undefined}
          className={inputClasses}
        />
        {errors.ctaText && (
          <p id={`${formId}-ctaText-error`} className={errorClasses} role="alert">
            {errors.ctaText.message}
          </p>
        )}
      </div>

      {/* CTA URL */}
      <div>
        <label htmlFor={`${formId}-ctaUrl`} className={labelClasses}>
          URL do CTA (opcional)
        </label>
        <input
          id={`${formId}-ctaUrl`}
          type="url"
          {...register('ctaUrl')}
          disabled={isSubmitting}
          placeholder="https://exemplo.com/landing-page"
          aria-invalid={!!errors.ctaUrl}
          aria-describedby={errors.ctaUrl ? `${formId}-ctaUrl-error` : undefined}
          className={inputClasses}
        />
        {errors.ctaUrl && (
          <p id={`${formId}-ctaUrl-error`} className={errorClasses} role="alert">
            {errors.ctaUrl.message}
          </p>
        )}
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isSubmitting}
        className={cn(
          'min-h-11 w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground',
          'hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ring',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'inline-flex items-center justify-center gap-2 transition-colors',
        )}
      >
        {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
        {isSubmitting ? 'Criando post...' : 'Criar post'}
      </button>
    </form>
  )
}
