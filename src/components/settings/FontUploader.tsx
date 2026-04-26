'use client'

// FontUploader — upload de TTF/OTF/WOFF para Satori (TASK-13 ST002 / CL-105)

import { useEffect, useState } from 'react'
import { toast } from 'sonner'

interface FontRow {
  id: string
  family: string
  weight: number
  style: string
  fileSize: number
  isActive: boolean
  createdAt: string
}

const MAX_MB = 5

export function FontUploader() {
  const [fonts, setFonts] = useState<FontRow[] | null>(null)
  const [uploading, setUploading] = useState(false)
  const [family, setFamily] = useState('')
  const [weight, setWeight] = useState(400)
  const [style, setStyle] = useState('normal')
  const [file, setFile] = useState<File | null>(null)

  async function load() {
    try {
      const res = await fetch('/api/v1/assets/fonts', { credentials: 'include' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as { data?: { fonts: FontRow[] } } | { fonts: FontRow[] }
      setFonts((data as { fonts?: FontRow[] }).fonts ?? (data as { data?: { fonts: FontRow[] } }).data?.fonts ?? [])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao listar')
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) {
      toast.error('Selecione um arquivo')
      return
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      toast.error(`Arquivo maior que ${MAX_MB}MB`)
      return
    }
    setUploading(true)
    try {
      const fd = new FormData()
      fd.set('file', file)
      fd.set('family', family)
      fd.set('weight', String(weight))
      fd.set('style', style)
      const res = await fetch('/api/v1/assets/fonts', {
        method: 'POST',
        credentials: 'include',
        body: fd,
      })
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { message?: string }
        throw new Error(err.message ?? `HTTP ${res.status}`)
      }
      toast.success('Fonte registrada')
      setFile(null)
      setFamily('')
      void load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha no upload')
    } finally {
      setUploading(false)
    }
  }

  return (
    <section className="space-y-4" data-testid="font-uploader">
      <form onSubmit={onSubmit} className="grid gap-3 rounded border border-border p-4 sm:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span>Familia</span>
          <input
            value={family}
            onChange={(e) => setFamily(e.target.value)}
            required
            className="w-full rounded border border-input bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span>Weight (100..900)</span>
          <input
            type="number"
            min={100}
            max={900}
            step={100}
            value={weight}
            onChange={(e) => setWeight(Number(e.target.value))}
            className="w-full rounded border border-input bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span>Estilo</span>
          <select
            value={style}
            onChange={(e) => setStyle(e.target.value)}
            className="w-full rounded border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="normal">normal</option>
            <option value="italic">italic</option>
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span>Arquivo (TTF/OTF/WOFF, max {MAX_MB}MB)</span>
          <input
            type="file"
            accept=".ttf,.otf,.woff,.woff2,font/ttf,font/otf,font/woff,font/woff2"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="w-full text-sm"
          />
        </label>
        <button
          type="submit"
          disabled={uploading || !file || !family}
          className="sm:col-span-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {uploading ? 'Enviando…' : 'Adicionar fonte'}
        </button>
      </form>

      <div>
        <h4 className="mb-2 text-sm font-semibold">Fontes registradas</h4>
        {fonts === null ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : fonts.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma fonte customizada ainda.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {fonts.map((f) => (
              <li key={f.id} className="rounded border border-border bg-background p-2">
                <strong>{f.family}</strong> · {f.weight} · {f.style} ·{' '}
                {(f.fileSize / 1024).toFixed(1)}KB
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
