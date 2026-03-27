'use client'

import { useState, useId } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
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

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreatePostInput>({
    resolver: zodResolver(createPostSchema),
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

  const labelClasses = 'block text-sm font-medium text-gray-700 mb-1'
  const inputClasses =
    'w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500'
  const errorClasses = 'mt-1 text-xs text-red-600'

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-5"
      aria-label="Formulario de criacao de post"
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
          className={inputClasses}
        >
          {(Object.keys(PUBLISHING_CHANNELS) as ChannelKey[]).map((key) => (
            <option key={key} value={key}>
              {PUBLISHING_CHANNELS[key].label}
            </option>
          ))}
        </select>
        {errors.channel && <p className={errorClasses}>{errors.channel.message}</p>}
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
          className={cn(inputClasses, 'resize-y')}
        />
        <div className="mt-1 flex items-center justify-between">
          {errors.caption ? (
            <p className={errorClasses}>{errors.caption.message}</p>
          ) : (
            <span />
          )}
          <span
            className={cn('text-xs', isOverLimit ? 'text-red-500 font-medium' : 'text-gray-500')}
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
        {errors.hashtags && <p className={errorClasses}>{errors.hashtags.message}</p>}
        <p className="mt-1 text-xs text-gray-500">
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
          className={inputClasses}
        />
        {errors.scheduledAt && <p className={errorClasses}>{errors.scheduledAt.message}</p>}
      </div>

      {/* URL da imagem */}
      <div>
        <label htmlFor={`${formId}-imageUrl`} className={labelClasses}>
          URL da imagem (opcional)
        </label>
        <input
          id={`${formId}-imageUrl`}
          type="text"
          {...register('imageUrl')}
          disabled={isSubmitting}
          placeholder="https://exemplo.com/imagem.jpg"
          className={inputClasses}
        />
        {errors.imageUrl && <p className={errorClasses}>{errors.imageUrl.message}</p>}
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
          className={inputClasses}
        />
        {errors.ctaText && <p className={errorClasses}>{errors.ctaText.message}</p>}
      </div>

      {/* CTA URL */}
      <div>
        <label htmlFor={`${formId}-ctaUrl`} className={labelClasses}>
          URL do CTA (opcional)
        </label>
        <input
          id={`${formId}-ctaUrl`}
          type="text"
          {...register('ctaUrl')}
          disabled={isSubmitting}
          placeholder="https://exemplo.com/landing-page"
          className={inputClasses}
        />
        {errors.ctaUrl && <p className={errorClasses}>{errors.ctaUrl.message}</p>}
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isSubmitting}
        className={cn(
          'min-h-11 w-full rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white',
          'hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500',
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
