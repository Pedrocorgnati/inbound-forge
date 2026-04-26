'use client'

// ImageTemplateForm — create/edit form com preview estatico das dimensoes.
// Intake-Review TASK-18 ST003 (CL-CG-018). Preview Satori real fica como
// ressalva — exige runtime Satori no client, fora de escopo pragmatico.

import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { toast } from 'sonner'

type Template = {
  id?: string
  name: string
  imageType: string
  templateType?: string | null
  channel: string
  width: number
  height: number
  isActive: boolean
  description?: string | null
}

type Props = {
  template: Template | null
  onClose: () => void
  onSaved: () => void
}

const IMAGE_TYPES = ['CAROUSEL', 'STATIC_PORTRAIT', 'STATIC_LANDSCAPE', 'VIDEO_COVER'] as const
const CHANNELS = ['instagram', 'linkedin', 'blog'] as const
const DIMENSIONS: Record<string, Array<{ width: number; height: number; label: string }>> = {
  instagram: [
    { width: 1080, height: 1080, label: '1:1 feed' },
    { width: 1080, height: 1350, label: '4:5 feed' },
    { width: 1080, height: 1920, label: '9:16 stories' },
  ],
  linkedin: [
    { width: 1200, height: 630, label: '1.91:1' },
    { width: 1080, height: 1080, label: '1:1' },
  ],
  blog: [{ width: 1200, height: 630, label: 'OG 1.91:1' }],
}

export function ImageTemplateForm({ template, onClose, onSaved }: Props) {
  const isEdit = !!template?.id
  const [form, setForm] = useState<Template>(
    template ?? {
      name: '',
      imageType: 'CAROUSEL',
      channel: 'instagram',
      width: 1080,
      height: 1080,
      isActive: true,
      description: '',
    },
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const save = async () => {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(
        isEdit ? `/api/image-templates/${template?.id}` : '/api/image-templates',
        {
          method: isEdit ? 'PUT' : 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(form),
        },
      )
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json?.error ?? `Falha (${res.status})`)
      }
      toast.success(isEdit ? 'Template atualizado' : 'Template criado')
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro')
    } finally {
      setBusy(false)
    }
  }

  const channelDimensions = DIMENSIONS[form.channel] ?? []

  return (
    <Dialog.Root open onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[90vw] max-w-[680px] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-background p-6 shadow-lg">
          <Dialog.Title className="text-lg font-semibold">
            {isEdit ? 'Editar template' : 'Novo template'}
          </Dialog.Title>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              void save()
            }}
            className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2"
            data-testid="image-template-form"
          >
            <label className="flex flex-col text-xs sm:col-span-2">
              Nome
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="mt-1 rounded border bg-background px-2 py-1 text-sm"
                data-testid="template-field-name"
              />
            </label>

            <label className="flex flex-col text-xs">
              Canal
              <select
                value={form.channel}
                onChange={(e) => setForm({ ...form, channel: e.target.value })}
                className="mt-1 rounded border bg-background px-2 py-1 text-sm"
              >
                {CHANNELS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col text-xs">
              Tipo
              <select
                value={form.imageType}
                onChange={(e) => setForm({ ...form, imageType: e.target.value })}
                className="mt-1 rounded border bg-background px-2 py-1 text-sm"
              >
                {IMAGE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col text-xs sm:col-span-2">
              Dimensoes
              <select
                value={`${form.width}x${form.height}`}
                onChange={(e) => {
                  const [w, h] = e.target.value.split('x').map(Number)
                  if (w && h) setForm({ ...form, width: w, height: h })
                }}
                className="mt-1 rounded border bg-background px-2 py-1 text-sm"
              >
                {channelDimensions.map((d) => (
                  <option key={`${d.width}x${d.height}`} value={`${d.width}x${d.height}`}>
                    {d.width}x{d.height} — {d.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col text-xs sm:col-span-2">
              Descricao
              <textarea
                rows={3}
                value={form.description ?? ''}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="mt-1 rounded border bg-background px-2 py-1 text-sm"
              />
            </label>

            <label className="flex items-center gap-2 text-xs sm:col-span-2">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              />
              Ativo (disponivel para workers)
            </label>

            <div className="sm:col-span-2">
              <p className="text-xs font-medium">Preview estatico</p>
              <div
                data-testid="template-preview"
                className="mt-2 flex items-center justify-center rounded border border-dashed border-border bg-muted/20 p-4"
              >
                <div
                  className="bg-gradient-to-br from-primary/40 to-primary/10"
                  style={{
                    width: Math.min(280, form.width / 5),
                    height: Math.min(280, form.height / 5),
                    aspectRatio: `${form.width} / ${form.height}`,
                  }}
                  aria-label={`${form.width}x${form.height}`}
                />
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Preview Satori real em tempo-de-edicao fica como follow-up (exige runtime no
                cliente).
              </p>
            </div>

            {error && (
              <p role="alert" className="text-xs text-destructive sm:col-span-2">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-2 sm:col-span-2">
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={busy}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
                data-testid="image-template-save"
              >
                {busy ? 'Salvando...' : isEdit ? 'Salvar' : 'Criar'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
