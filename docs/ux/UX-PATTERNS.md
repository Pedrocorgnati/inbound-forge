# UX Patterns — Inbound Forge

Referencia canonica para componentes de UX reutilizaveis. Sempre importar a
partir de `@/components/ui/*`. As implementacoes concretas vivem em
`@/components/shared/*` (legado) — as wrappers em `ui/` sao a API publica.

Rastreabilidade: TASK-1 (CL-274, CL-275) — intake-review.

---

## 1. EmptyState

Estado vazio padronizado para listas e grids.

### API

```tsx
import { EmptyState } from '@/components/ui/EmptyState'

<EmptyState
  variant="noData" // 'noData' | 'noResults' | 'error'
  title="Nenhum lead registrado"
  description="Adicione o primeiro lead para comecar."
  actionLabel="Registrar lead"
  actionHref="/pt-BR/leads/new"
/>
```

### Quando usar cada `variant`

| Variant | Contexto |
|---------|----------|
| `noData` | A colecao nunca teve dados (onboarding). CTA para criar o primeiro item. |
| `noResults` | Filtros aplicados nao retornam itens. CTA para limpar filtros. |
| `error` | Falha ao carregar. CTA para tentar novamente. |

### i18n keys

Chaves em `common.emptyState.*` nos 4 locales (`pt-BR`, `en-US`, `it-IT`, `es-ES`).
Nunca hardcode textos — use `useTranslations('common.emptyState')`.

### Coverage canonica

Listas no app que JA usam `EmptyState`:
- `LeadsList`, `PipelineBoard` (leads)
- `CaseList`, `PainList`, `ObjectionList`, `PatternList` (knowledge)
- `SourceList`, `ThemeHistoryTable`, `ThemeSourcesList`
- `AssetGallery`, `AssetBackgroundPicker`
- `ConversionHistory`, `ReconciliationPanel`, `FunnelChart`, `ThemeRankingTable`
- `UTMLinkListClient`, `DashboardContent`, `ContentPageClient`

Temas tem variante dedicada (`ThemesEmptyState`) com razoes explicitas
(`NO_NICHE`, `SCRAPING`, `FILTER_EMPTY`, `NO_THEMES`).

---

## 2. ConfirmDialog

Modal padronizado para acoes destrutivas ou com side-effects relevantes.

### API

```tsx
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

const [open, setOpen] = useState(false)

<button onClick={() => setOpen(true)}>Excluir</button>
<ConfirmDialog
  open={open}
  onOpenChange={setOpen}
  title="Excluir item?"
  description="Esta acao nao pode ser desfeita."
  confirmLabel="Excluir"
  variant="destructive" // 'destructive' | 'default'
  onConfirm={handleDelete}
/>
```

### Regras

- **Nunca** usar `window.confirm`. Sempre `<ConfirmDialog />`.
- `variant="destructive"` dispara botao vermelho (`danger`).
- `variant="default"` para operacoes caras porem reversiveis (regenerar, restaurar).
- Async `onConfirm`: o dialog trava o botao durante a promise.

### i18n keys

Chaves em `common.confirmDialog.*` nos 4 locales.

### Coverage canonica

Acoes destrutivas que JA usam Modal/ConfirmDialog:
- Delete Lead (`LeadsList`, `LeadDeleteDialog`)
- Reject Theme (`ThemeRejectModal`)
- Lead Loss Reason (`LeadLossReasonModal`)
- Content Reject (`ContentRejectModal`), Regenerate (`RegenerateConfirmDialog`)
- Restore Theme (`ThemeRestoreModal`)

Substituicoes feitas no TASK-1 ST004:
- `ContentVersionHistory` (restore) — `confirm()` → `ConfirmDialog`
- `VersionTimeline` (restore) — `confirm()` → `ConfirmDialog`
- `BulkRegenerateButton` — `confirm()` → `ConfirmDialog`

---

## 3. Loading States

Toda rota protegida deve ter `loading.tsx` ou skeleton inline.

### Coverage canonica

Rotas com `loading.tsx` dedicado:
- `/(protected)/loading.tsx` — fallback global
- `/(protected)/dashboard/loading.tsx` — 4-col bento
- `/(protected)/calendar/loading.tsx` — grid 7x5
- `/(protected)/analytics/loading.tsx` — KPIs + chart
- `/(protected)/themes/[id]/loading.tsx`
- `/(protected)/leads/[id]/loading.tsx`
- `/(protected)/content/[themeId]/loading.tsx`

### Primitivas

- `SkeletonCard` — card generico
- `Skeleton` — linha/bloco base
- `animate-pulse rounded-md bg-muted` — skeleton inline ad-hoc

### Regras

- `aria-busy="true"` no container raiz do loading.
- `data-testid="{route}-loading"` para E2E snapshots.
- Nunca deixar tela em branco durante navegacao.

---

## 4. Checklist para novas listas

- [ ] Estado `loading` renderiza skeleton (3+ items)
- [ ] Estado `empty` renderiza `<EmptyState>` com variant correta
- [ ] Estado `error` renderiza `role="alert"` + botao retry
- [ ] Qualquer `DELETE` passa por `<ConfirmDialog variant="destructive">`
- [ ] Textos vem de `next-intl` (zero hardcode)
- [ ] Touch targets respeitam `min-h-11` (botoes, links de acao)
