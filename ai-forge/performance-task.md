# Performance Task List — Inbound Forge
**Gerado em:** 2026-04-05
**Workspace:** `output/workspace/inbound-forge`
**Auditoria:** `/nextjs:performance`

---

## Resumo da Varredura

| Categoria | Status | Severidade |
|-----------|--------|-----------|
| Props inline / onClick handlers | ⚠️ 80 ocorrências / 44 arquivos | MÉDIA |
| useMemo / useCallback / React.memo | ✅ Bem usado nos hooks críticos | BAIXA |
| Dynamic imports | ✅ Implementado em Charts | NENHUMA |
| Imports pesados (lodash/moment/etc.) | ✅ Nenhum detectado | NENHUMA |
| Concurrent features (useTransition) | ❌ Não implementado | BAIXA |
| Virtual lists | ❌ Não implementado (paginação compensa) | BAIXA |
| Web Vitals monitoring | ❌ Ausente (Sentry sem setup explícito) | MÉDIA |
| Resize handler sem debounce | ⚠️ 2 arquivos | MÉDIA |
| useEffect cleanup | ✅ Sem memory leaks detectados | NENHUMA |
| Bundle analyzer | ❌ Não configurado | BAIXA |
| optimizePackageImports | ❌ Não configurado | BAIXA |

---

## T001 – Debounce no resize listener do CalendarContent

**Tipo:** SEQUENTIAL
**Dependências:** none
**Status:** TODO

**Arquivos:**
- modificar: `src/components/calendar/CalendarContent.tsx`

**Descrição:**
O listener de `resize` em `CalendarContent.tsx` (linha 68–73) dispara `setIsMobile` a cada pixel de resize sem debounce. Durante o evento de redimensionamento, `check()` pode ser chamada 60+ vezes por segundo, causando dezenas de re-renders desnecessários do componente e de todos os seus filhos (`CalendarGrid`, `CalendarListView`, `CalendarFilters`).

O hook `useDebounce` já existe em `src/hooks/useDebounce.ts` — aproveitar a mesma lógica.

**Fix:**
```tsx
// Antes (linha 67–74):
useEffect(() => {
  function check() {
    setIsMobile(window.innerWidth < 768)
  }
  check()
  window.addEventListener('resize', check)
  return () => window.removeEventListener('resize', check)
}, [])

// Depois:
useEffect(() => {
  let timer: ReturnType<typeof setTimeout>
  function check() {
    clearTimeout(timer)
    timer = setTimeout(() => {
      setIsMobile(window.innerWidth < 768)
    }, 150)
  }
  check() // executa imediato na montagem
  window.addEventListener('resize', check)
  return () => {
    window.removeEventListener('resize', check)
    clearTimeout(timer)
  }
}, [])
```

**Critérios de Aceite:**
- [ ] Listener de resize usa debounce de 150ms
- [ ] Cleanup correto (clearTimeout no cleanup)
- [ ] Comportamento mobile-first mantido
- [ ] `npm run lint` sem warnings

**Estimativa:** 30min

---

## T002 – optimizePackageImports no next.config.mjs

**Tipo:** SEQUENTIAL
**Dependências:** none
**Status:** TODO

**Arquivos:**
- modificar: `next.config.mjs`

**Descrição:**
O `next.config.mjs` não configura `optimizePackageImports`, o que significa que pacotes como `lucide-react` (340+ ícones disponíveis), `@radix-ui/*` e `recharts` podem ter mais módulos bundled do que o necessário. Com `optimizePackageImports`, o Next.js garante que apenas os exports usados sejam incluídos no bundle do cliente.

**Fix:**
```js
// Adicionar dentro de experimental:
experimental: {
  serverComponentsExternalPackages: ['@resvg/resvg-js', 'sharp'],
  optimizePackageImports: ['lucide-react', 'recharts', 'date-fns'],
},
```

**Critérios de Aceite:**
- [ ] `optimizePackageImports` configurado para `lucide-react`, `recharts`, `date-fns`
- [ ] `npm run build` sem erros
- [ ] Nenhuma regressão de ícones/charts

**Estimativa:** 15min

---

## T003 – Web Vitals monitoring explícito

**Tipo:** SEQUENTIAL
**Dependências:** none
**Status:** TODO

**Arquivos:**
- criar: `src/lib/web-vitals.ts`
- modificar: `src/app/[locale]/layout.tsx` (ou root layout)

**Descrição:**
O projeto usa `@sentry/nextjs` (v10.47.0) que captura Web Vitals automaticamente via `withSentryConfig`, mas sem configuração explícita. Não há chamadas explícitas para `onLCP`, `onCLS`, `onINP`, `onFCP`, `onTTFB`. Para métricas rastreáveis e debug em produção, é recomendado reportar explicitamente via `web-vitals` + Sentry.

O Sentry já está configurado em `sentry.client.config.ts` com DSN — apenas falta o hook de Web Vitals.

**Fix:**
```bash
npm install web-vitals
```

```ts
// src/lib/web-vitals.ts
import type { Metric } from 'web-vitals'

export function reportWebVitals(metric: Metric) {
  // Sentry já captura automaticamente, mas isso permite log/debug explícito
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Web Vital] ${metric.name}:`, metric.value.toFixed(1), 'ms')
  }
  // Opcional: enviar para analytics customizado
  if (typeof window !== 'undefined' && 'sendBeacon' in navigator) {
    const body = JSON.stringify({ name: metric.name, value: metric.value, id: metric.id })
    navigator.sendBeacon('/api/vitals', body)
  }
}
```

```tsx
// No root layout ou em _app equivalente (Next.js 14 App Router):
// src/app/[locale]/layout.tsx — adicionar WebVitalsReporter
'use client'
import { useReportWebVitals } from 'next/dist/client/components/web-vitals'
import { reportWebVitals } from '@/lib/web-vitals'

export function WebVitalsReporter() {
  useReportWebVitals(reportWebVitals)
  return null
}
```

**Nota:** Se não quiser criar endpoint `/api/vitals`, o log em dev já é suficiente. O Sentry captura LCP/CLS/INP automaticamente via SDK.

**Critérios de Aceite:**
- [ ] `web-vitals` instalado (ou `useReportWebVitals` do Next.js utilizado)
- [ ] Log de métricas visível em dev (LCP, CLS, INP)
- [ ] Sentry recebe Web Vitals em produção (validar no dashboard Sentry)
- [ ] `npm run build` sem erros

**Estimativa:** 1h

---

## T004 – Bundle analyzer configurado

**Tipo:** SEQUENTIAL
**Dependências:** none
**Status:** TODO

**Arquivos:**
- modificar: `next.config.mjs`
- modificar: `package.json`

**Descrição:**
Não há visibilidade do tamanho do bundle. À medida que o projeto cresce (next-intl, recharts, @anthropic-ai/sdk, posthog-js), o bundle pode aumentar silenciosamente. O `@next/bundle-analyzer` adiciona um script de análise sem impacto no bundle de produção.

**Fix:**
```bash
npm install --save-dev @next/bundle-analyzer
```

```js
// next.config.mjs — topo do arquivo:
import withBundleAnalyzer from '@next/bundle-analyzer'

const bundleAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})

// ...existing code...

export default bundleAnalyzer(withSentryConfig(withIntl, sentryConfig))
```

```json
// package.json — scripts:
"analyze": "ANALYZE=true npm run build"
```

**Critérios de Aceite:**
- [ ] `@next/bundle-analyzer` instalado como devDependency
- [ ] Script `npm run analyze` funcional
- [ ] Build normal não afetado
- [ ] `ANALYZE=true npm run build` abre relatório sem erro

**Estimativa:** 30min

---

## T005 – useCallback em handlers de CalendarGrid

**Tipo:** SEQUENTIAL
**Dependências:** none
**Status:** TODO

**Arquivos:**
- modificar: `src/components/calendar/CalendarContent.tsx`
- modificar: `src/components/calendar/CalendarGrid.tsx`

**Descrição:**
`CalendarGrid` recebe as callbacks `onViewChange` e `onPeriodChange` como props (linha 64–118). Atualmente em `CalendarContent`, essas funções são criadas inline a cada render ou como funções normais (não memoizadas). Com o `useMemo` do `{ startDate, endDate }` e o state complexo de CalendarContent, qualquer estado que mude dispara nova renderização do `CalendarGrid`.

Verificar em CalendarContent se `onViewChange`/`onPeriodChange`/`toggleListView` usam `useCallback` — se não, adicionar.

**Fix:**
```tsx
// CalendarContent.tsx — envolver handlers com useCallback
const handleViewChange = useCallback((v: CalendarViewType) => {
  setView(v)
}, [])

const handlePeriodChange = useCallback((direction: 'prev' | 'next' | 'today') => {
  // lógica de navegação...
}, [view, currentDate]) // dependências corretas

const handleToggleListView = useCallback(() => {
  const next = !showListView
  setShowListView(next)
  localStorage.setItem(STORAGE_KEYS.CALENDAR_LIST_VIEW, String(next))
}, [showListView])
```

**Critérios de Aceite:**
- [ ] `onViewChange`, `onPeriodChange`, `toggleListView` envolvidos com `useCallback`
- [ ] Dependências de `useCallback` corretas e completas
- [ ] Comportamento do calendário mantido (navegar semanas/meses)
- [ ] `npm run lint` sem warnings

**Estimativa:** 1h

---

## T006 – useCallback em sort/pagination do ThemeRankingTable

**Tipo:** SEQUENTIAL
**Dependências:** none
**Status:** TODO

**Arquivos:**
- modificar: `src/components/analytics/ThemeRankingTable.tsx`

**Descrição:**
`ThemeRankingTable` tem 5 handlers inline:
- `onClick={() => refetch()}` (linha 87) — recria função a cada render
- `onClick={() => handleSort('conversionScore')}` (linha 121) — closure com argumento
- `onClick={() => handleSort('leadsCount')}` (linha 130) — closure com argumento
- `onClick={() => setPage((p) => p - 1)}` (linha 176)
- `onClick={() => setPage((p) => p + 1)}` (linha 184)

Os dois últimos (`setPage`) já recebem função updater (não closure externa), são estáveis. Os primeiros 3 merecem `useCallback`.

**Fix:**
```tsx
const handleRetry = useCallback(() => refetch(), [refetch])
const handleSortConversion = useCallback(() => handleSort('conversionScore'), [handleSort])
const handleSortLeads = useCallback(() => handleSort('leadsCount'), [handleSort])
const handlePrevPage = useCallback(() => setPage((p) => p - 1), [])
const handleNextPage = useCallback(() => setPage((p) => p + 1), [])
```

**Critérios de Aceite:**
- [ ] 5 handlers memoizados com `useCallback`
- [ ] Ordenação e paginação funcionam corretamente
- [ ] `npm run lint` sem warnings

**Estimativa:** 45min

---

## T007 – useTransition para ordenação em ThemeRankingTable

**Tipo:** SEQUENTIAL
**Dependências:** T006
**Status:** TODO

**Arquivos:**
- modificar: `src/components/analytics/ThemeRankingTable.tsx`

**Descrição:**
A ordenação da tabela (`handleSort`) é um update de estado que re-renderiza potencialmente muitas linhas. Usar `useTransition` marca esse update como não urgente, mantendo a UI responsiva durante o recálculo. Isso aplica Concurrent features do React 18 de forma simples e sem risco.

**Fix:**
```tsx
import { useTransition, useCallback, useState } from 'react'

const [isPending, startTransition] = useTransition()

// No handleSort:
const handleSort = useCallback((field: SortField) => {
  startTransition(() => {
    setSortField(prev => prev === field ? null : field)
    setSortDir(prev => /* lógica */)
  })
}, [])

// No header da coluna — feedback visual:
<button
  onClick={handleSortConversion}
  disabled={isPending}
  className={cn('...', isPending && 'opacity-60')}
>
```

**Critérios de Aceite:**
- [ ] `useTransition` aplicado ao sort
- [ ] `isPending` usado como feedback visual (opacity ou spinner)
- [ ] Ordenação funciona sem travamento perceptível
- [ ] `npm run lint` sem warnings

**Estimativa:** 30min

---

## ACHADOS SEM TAREFA (documentados)

### Bem implementado — manter

| Aspecto | Detalhe |
|---------|---------|
| Charts com SSR-safe `dynamic()` | `ChartWrapper`, `FunnelChart`, `SparklineChart` — corretos |
| `React.memo` em charts | `ChartWrapper` e `FunnelChart` exportam com `memo()` |
| useEffect cleanup | Todos os hooks com AbortController, clearInterval, isMountedRef |
| Imports pesados | Nenhum lodash/moment/react-icons — excelente escolha de deps |
| `useCallback` em hooks | `useCalendarPosts`, `useHealthPolling`, `useAutosave`, `useImageJobPolling` |
| Paginação em listas | CaseList, LeadsList, AssetGallery, PatternList — virtual list não necessária |

### Inline handlers de baixo risco (não geram tarefas)

Os 80 `onClick={() =>}` restantes em 44 arquivos são em sua maioria:
- Botões simples de UI (`setPage`, `setOpen`, `setExpanded`) sem child memoizados
- Componentes que não são `React.memo` — useCallback não traz benefício
- Seriam úteis **apenas** se os componentes filhos fossem envolvidos em `React.memo`

Prioridade baixa até que haja evidência de re-render excessivo (Profiler).

---

## Checklist de Execução

- [x] T001 — Debounce resize handler — `CalendarContent.tsx` + `DataTestOverlay.tsx`
- [x] T002 — optimizePackageImports — `next.config.mjs` (lucide-react, recharts, date-fns)
- [x] T003 — Web Vitals monitoring — `src/components/analytics/WebVitalsReporter.tsx` + root layout
- [x] T004 — Bundle analyzer — `package.json` (script analyze) + `next.config.mjs` (ANALYZE env)
- [x] T005 — useCallback CalendarGrid handlers — `CalendarContent.tsx` (handleViewChange, handlePeriodChange, handleListPeriodChange, handleReschedule, toggleListView)
- [x] T006 — useCallback ThemeRankingTable — `ThemeRankingTable.tsx` (handleRetry, handleSortConversion, handleSortLeads, handlePrevPage, handleNextPage)
- [x] T007 — useTransition sort — `ThemeRankingTable.tsx` (isSortPending + startSortTransition)

**Pendente (requer `npm install`):**
- [ ] Executar `npm install` no workspace para instalar `@next/bundle-analyzer`
- [ ] Executar `npm run build` para validar

**Total estimado:** ~4h30min
