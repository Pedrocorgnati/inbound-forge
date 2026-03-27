'use client'

import * as React from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ArticleEditor } from './ArticleEditor'
import { SlugField } from './SlugField'
import { CTAConfig } from './CTAConfig'
import {
  createArticleSchema,
  updateArticleSchema,
  type CreateArticleInput,
  type UpdateArticleInput,
} from '@/lib/validators/blog-article'
import {
  MAX_META_DESCRIPTION_LENGTH,
  MAX_META_TITLE_LENGTH,
  DEFAULT_AUTHOR,
} from '@/lib/constants/blog'
import type { BlogArticle } from '@/types/blog'

type ArticleFormMode = 'create' | 'edit'

interface ArticleFormProps {
  mode: ArticleFormMode
  article?: BlogArticle
  onSuccess?: (article: BlogArticle) => void
}

type FormValues = CreateArticleInput

export function ArticleForm({ mode, article, onSuccess }: ArticleFormProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [tagInput, setTagInput] = React.useState('')

  const schema = mode === 'create' ? createArticleSchema : updateArticleSchema

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: article?.title ?? '',
      slug: article?.slug ?? '',
      body: article?.body ?? '',
      excerpt: article?.excerpt ?? '',
      status: article?.status ?? 'DRAFT',
      metaTitle: article?.metaTitle ?? '',
      metaDescription: article?.metaDescription ?? '',
      canonicalUrl: article?.canonicalUrl ?? '',
      tags: article?.tags ?? [],
      ctaType: (article?.ctaType as FormValues['ctaType']) ?? undefined,
      ctaUrl: article?.ctaUrl ?? '',
      ctaLabel: article?.ctaLabel ?? '',
      authorName: article?.authorName ?? DEFAULT_AUTHOR,
      changeNote: '',
    },
  })

  const title = watch('title')
  const metaTitle = watch('metaTitle')
  const metaDescription = watch('metaDescription')
  const tags = watch('tags')
  const ctaType = watch('ctaType')
  const ctaUrl = watch('ctaUrl')
  const ctaLabel = watch('ctaLabel')

  async function submitForm(data: FormValues, targetStatus: 'DRAFT' | 'REVIEW') {
    setIsSubmitting(true)
    const payload = { ...data, status: targetStatus }

    try {
      const url =
        mode === 'create'
          ? '/api/blog-articles'
          : `/api/blog-articles/${article?.id}`
      const method = mode === 'create' ? 'POST' : 'PUT'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.message ?? `Erro ${res.status}`)
      }

      const saved: BlogArticle = await res.json()

      toast.success(
        targetStatus === 'DRAFT'
          ? 'Rascunho salvo com sucesso!'
          : 'Artigo enviado para revisao!'
      )

      onSuccess?.(saved)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao salvar artigo'
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleSaveDraft() {
    handleSubmit((data) => submitForm(data, 'DRAFT'))()
  }

  function handleSendReview() {
    handleSubmit((data) => submitForm(data, 'REVIEW'))()
  }

  function handleAddTag(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter' && e.key !== ',') return
    e.preventDefault()
    const tag = tagInput.trim().toLowerCase()
    if (!tag) return
    const current = getValues('tags') ?? []
    if (current.includes(tag)) {
      toast.error('Tag ja adicionada')
      return
    }
    if (current.length >= 20) {
      toast.error('Maximo de 20 tags')
      return
    }
    setValue('tags', [...current, tag], { shouldValidate: true })
    setTagInput('')
  }

  function handleRemoveTag(tag: string) {
    const current = getValues('tags') ?? []
    setValue(
      'tags',
      current.filter((t) => t !== tag),
      { shouldValidate: true }
    )
  }

  if (mode === 'edit' && !article) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
      {/* Titulo */}
      <Input
        label="Titulo"
        {...register('title')}
        error={errors.title?.message}
        placeholder="Titulo do artigo"
      />

      {/* Slug */}
      <Controller
        control={control}
        name="slug"
        render={({ field }) => (
          <SlugField
            title={title}
            value={field.value}
            onChange={field.onChange}
            error={errors.slug?.message}
          />
        )}
      />

      {/* Excerpt */}
      <div className="space-y-1">
        <Label htmlFor="excerpt">Excerpt</Label>
        <textarea
          id="excerpt"
          {...register('excerpt')}
          className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          placeholder="Resumo curto do artigo (exibido na listagem)"
          rows={3}
        />
        {errors.excerpt && (
          <p className="text-xs text-danger" role="alert">{errors.excerpt.message}</p>
        )}
      </div>

      {/* Body / Markdown Editor */}
      <div className="space-y-1">
        <Label>Conteudo</Label>
        <Controller
          control={control}
          name="body"
          render={({ field }) => (
            <ArticleEditor value={field.value} onChange={field.onChange} />
          )}
        />
        {errors.body && (
          <p className="text-xs text-danger" role="alert">{errors.body.message}</p>
        )}
      </div>

      {/* SEO Section */}
      <fieldset className="space-y-4 rounded-md border border-border p-4">
        <legend className="px-2 text-sm font-medium text-foreground">SEO</legend>

        <div className="space-y-1">
          <Input
            label="Meta Titulo"
            {...register('metaTitle')}
            error={errors.metaTitle?.message}
            placeholder="Titulo para SEO"
          />
          <p className="text-xs text-muted-foreground">
            {(metaTitle ?? '').length}/{MAX_META_TITLE_LENGTH} caracteres
          </p>
        </div>

        <div className="space-y-1">
          <Label htmlFor="metaDescription">Meta Descricao</Label>
          <textarea
            id="metaDescription"
            {...register('metaDescription')}
            className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Descricao para SEO (max 160 caracteres)"
            rows={2}
          />
          <p
            className={`text-xs ${
              (metaDescription ?? '').length > MAX_META_DESCRIPTION_LENGTH
                ? 'text-danger font-medium'
                : 'text-muted-foreground'
            }`}
          >
            {(metaDescription ?? '').length}/{MAX_META_DESCRIPTION_LENGTH} caracteres
          </p>
          {errors.metaDescription && (
            <p className="text-xs text-danger" role="alert">{errors.metaDescription.message}</p>
          )}
        </div>

        <Input
          label="URL Canonica"
          {...register('canonicalUrl')}
          error={errors.canonicalUrl?.message}
          placeholder="https://..."
        />

        {/* Tags */}
        <div className="space-y-2">
          <Label>Tags</Label>
          <div className="flex flex-wrap gap-1">
            {(tags ?? []).map((tag) => (
              <Badge key={tag} variant="primary" className="gap-1">
                {tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  aria-label={`Remover tag ${tag}`}
                  className="ml-0.5 hover:text-red-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <Input
            placeholder="Digite uma tag e pressione Enter"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleAddTag}
            helperText="Pressione Enter ou virgula para adicionar"
          />
          {errors.tags && (
            <p className="text-xs text-danger" role="alert">{errors.tags.message}</p>
          )}
        </div>
      </fieldset>

      {/* CTA */}
      <CTAConfig
        ctaType={ctaType ?? ''}
        ctaUrl={ctaUrl ?? ''}
        ctaLabel={ctaLabel ?? ''}
        onCtaTypeChange={(v) => setValue('ctaType', (v || undefined) as FormValues['ctaType'], { shouldValidate: true })}
        onCtaUrlChange={(v) => setValue('ctaUrl', v, { shouldValidate: true })}
        onCtaLabelChange={(v) => setValue('ctaLabel', v, { shouldValidate: true })}
        errors={{
          ctaType: errors.ctaType?.message,
          ctaUrl: errors.ctaUrl?.message,
          ctaLabel: errors.ctaLabel?.message,
        }}
      />

      {/* Change note (edit mode) */}
      {mode === 'edit' && (
        <Input
          label="Nota de alteracao"
          {...register('changeNote')}
          error={errors.changeNote?.message}
          placeholder="Descreva brevemente o que mudou"
        />
      )}

      {/* Author */}
      <Input
        label="Autor"
        {...register('authorName')}
        error={errors.authorName?.message}
        placeholder="Pedro Corgnati"
      />

      {/* Action buttons */}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={handleSaveDraft}
          disabled={isSubmitting}
          isLoading={isSubmitting}
          loadingText="Salvando..."
        >
          Salvar Rascunho
        </Button>
        <Button
          type="button"
          onClick={handleSendReview}
          disabled={isSubmitting}
          isLoading={isSubmitting}
          loadingText="Enviando..."
        >
          Enviar para Revisao
        </Button>
      </div>
    </form>
  )
}
