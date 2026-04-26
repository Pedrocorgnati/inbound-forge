'use client'

/**
 * TASK-11/ST002 (CL-218) — Painel lateral de metadata do blog post.
 */
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  postMetadataSchema,
  type PostMetadataInput,
} from '@/lib/validators/post-metadata.schema'

interface Props {
  articleId: string
  initial: Partial<PostMetadataInput>
  open: boolean
  onClose: () => void
  onSaved?: () => void
}

export function PostMetadataPanel({ articleId, initial, open, onClose, onSaved }: Props) {
  const [tagsText, setTagsText] = useState<string>((initial.tags ?? []).join(', '))
  const [slugError, setSlugError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PostMetadataInput>({
    resolver: zodResolver(postMetadataSchema),
    defaultValues: {
      slug: initial.slug ?? '',
      tags: initial.tags ?? [],
      featuredImageUrl: initial.featuredImageUrl ?? null,
      coverImageAlt: initial.coverImageAlt ?? null,
      authorName: initial.authorName ?? '',
      publishedAt: initial.publishedAt ?? null,
      metaTitle: initial.metaTitle ?? null,
      metaDescription: initial.metaDescription ?? null,
      canonicalUrl: initial.canonicalUrl ?? null,
    },
  })

  async function onSubmit(data: PostMetadataInput) {
    setSlugError(null)
    const tags = tagsText
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
    const payload = { ...data, tags }
    try {
      const res = await fetch(`/api/v1/blog/${articleId}/metadata`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include',
      })
      if (res.status === 409) {
        setSlugError('Slug ja existe')
        return
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      toast.success('Metadata atualizada')
      onSaved?.()
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar')
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Metadata do post" size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <div>
          <Label htmlFor="slug">Slug</Label>
          <Input id="slug" {...register('slug')} />
          {(errors.slug || slugError) && (
            <p className="mt-1 text-xs text-destructive">
              {slugError ?? errors.slug?.message}
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="tags">Tags (separadas por virgula, max 8)</Label>
          <Input
            id="tags"
            value={tagsText}
            onChange={(e) => setTagsText(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="featuredImageUrl">Capa (URL)</Label>
          <Input id="featuredImageUrl" {...register('featuredImageUrl')} />
        </div>
        <div>
          <Label htmlFor="authorName">Autor</Label>
          <Input id="authorName" {...register('authorName')} />
          {errors.authorName && (
            <p className="mt-1 text-xs text-destructive">{errors.authorName.message}</p>
          )}
        </div>
        <div>
          <Label htmlFor="publishedAt">Data de publicacao (ISO)</Label>
          <Input id="publishedAt" type="datetime-local" {...register('publishedAt')} />
        </div>
        <div>
          <Label htmlFor="metaTitle">SEO title (max 60)</Label>
          <Input id="metaTitle" {...register('metaTitle')} maxLength={60} />
        </div>
        <div>
          <Label htmlFor="metaDescription">SEO description (max 160)</Label>
          <Textarea id="metaDescription" {...register('metaDescription')} maxLength={160} />
        </div>
        <div>
          <Label htmlFor="canonicalUrl">Canonical URL</Label>
          <Input id="canonicalUrl" {...register('canonicalUrl')} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded border px-3 py-1.5 text-sm"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-50"
          >
            {isSubmitting ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
