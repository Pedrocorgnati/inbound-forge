'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, Plus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/toast'

interface PainItem {
  id: string
  title: string
}

interface CaseItem {
  id: string
  name: string
}

interface SavedPattern {
  name: string
}

interface SolutionsStepProps {
  onComplete: () => void
  onBack: () => void
}

export function SolutionsStep({ onComplete, onBack }: SolutionsStepProps) {
  const [pains, setPains] = useState<PainItem[]>([])
  const [cases, setCases] = useState<CaseItem[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [savedPatterns, setSavedPatterns] = useState<SavedPattern[]>([])
  const [submitting, setSubmitting] = useState(false)

  // Form fields
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [selectedPainId, setSelectedPainId] = useState('')
  const [selectedCaseId, setSelectedCaseId] = useState('')

  useEffect(() => {
    async function loadData() {
      try {
        const [painsRes, casesRes] = await Promise.all([
          fetch('/api/v1/knowledge/pains?limit=100'),
          fetch('/api/v1/knowledge/cases?limit=100'),
        ])

        if (painsRes.ok) {
          const painsData = await painsRes.json() as { data: PainItem[] }
          setPains(painsData.data ?? [])
        }
        if (casesRes.ok) {
          const casesData = await casesRes.json() as { data: CaseItem[] }
          setCases(casesData.data ?? [])
        }
      } catch {
        toast.error('Erro ao carregar dados')
      } finally {
        setLoadingData(false)
      }
    }

    loadData()
  }, [])

  async function handleAdd() {
    if (name.length < 3) {
      toast.error('Nome deve ter no minimo 3 caracteres')
      return
    }
    if (description.length < 10) {
      toast.error('Descricao deve ter no minimo 10 caracteres')
      return
    }
    if (!selectedPainId) {
      toast.error('Selecione uma dor')
      return
    }
    if (!selectedCaseId) {
      toast.error('Selecione um case')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/v1/knowledge/patterns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          painId: selectedPainId,
          caseId: selectedCaseId,
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error((body as { error?: string } | null)?.error ?? 'Erro ao salvar padrao')
      }

      setSavedPatterns((prev) => [...prev, { name }])
      toast.success('Padrao de solucao registrado')
      setName('')
      setDescription('')
      setSelectedPainId('')
      setSelectedCaseId('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar padrao')
    } finally {
      setSubmitting(false)
    }
  }

  if (loadingData) {
    return (
      <div data-testid="solutions-step-loading" className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div data-testid="solutions-step" className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Vincule padroes de solucao as dores e cases registrados. Isso gera conteudo mais
        preciso e direcionado.
      </p>

      {/* Saved patterns */}
      {savedPatterns.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            {savedPatterns.length} padrao{savedPatterns.length > 1 ? 'oes' : ''} registrado{savedPatterns.length > 1 ? 's' : ''}
          </p>
          {savedPatterns.map((p, i) => (
            <div
              key={i}
              className="rounded-md border border-green-500/30 bg-green-500/5 px-3 py-2 text-sm font-medium"
            >
              {p.name}
            </div>
          ))}
        </div>
      )}

      {/* Form */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="pattern-name">Nome do padrao</Label>
          <Input
            id="pattern-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Automacao de funil de vendas"
          />
        </div>

        <div>
          <Label htmlFor="pattern-description">Descricao</Label>
          <textarea
            id="pattern-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descreva o padrao de solucao (minimo 10 caracteres)"
            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-[150ms] hover:border-foreground/30"
          />
        </div>

        <div>
          <Label htmlFor="pattern-pain">Dor relacionada</Label>
          <select
            id="pattern-pain"
            value={selectedPainId}
            onChange={(e) => setSelectedPainId(e.target.value)}
            className="flex min-h-[44px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 transition-colors duration-[150ms] hover:border-foreground/30"
          >
            <option value="">Selecione uma dor</option>
            {pains.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
          {pains.length === 0 && (
            <p className="mt-1 text-xs text-warning">
              Nenhuma dor registrada. Volte ao passo anterior para adicionar.
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="pattern-case">Case relacionado</Label>
          <select
            id="pattern-case"
            value={selectedCaseId}
            onChange={(e) => setSelectedCaseId(e.target.value)}
            className="flex min-h-[44px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 transition-colors duration-[150ms] hover:border-foreground/30"
          >
            <option value="">Selecione um case</option>
            {cases.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <Button
          data-testid="solutions-add-btn"
          variant="secondary"
          onClick={handleAdd}
          disabled={submitting}
          className="w-full"
        >
          {submitting ? (
            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
          ) : (
            <Plus className="mr-1 h-4 w-4" />
          )}
          Adicionar padrao
        </Button>
      </div>

      <div className="flex justify-between pt-2">
        <Button
          data-testid="solutions-back-btn"
          variant="ghost"
          onClick={onBack}
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Voltar
        </Button>
        <Button
          data-testid="solutions-next-btn"
          onClick={onComplete}
          disabled={savedPatterns.length < 1}
        >
          Proximo
          <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
