# Data Fetching Report — Inbound Forge

Gerado em: 2026-04-05  
Referência: `ai-forge/nextjs-data-fetching-tasks.md`

---

## Execução Completa

### Métricas

| Métrica | Antes | Depois |
|---------|-------|--------|
| `React.cache()` em uso | 0 | 2 funções |
| `unstable_cache` em uso | 0 | 1 função |
| Queries Prisma duplicadas por request | 2 | 0 |
| Conflitos `revalidate` + `searchParams` | 2 páginas | 0 |
| Waterfalls `listPublished` → `listAllTags` | 1 (blog/page) | eliminado |
| `<Suspense>` para TagNavigation | 0 | 1 |

---

## T001 — React.cache() para deduplicação ✅

**Problema:** `generateMetadata` e o page component chamavam a mesma query Prisma independentemente — 2 queries por request.

**Arquivos criados:**
- `src/lib/data/blog.data.ts` — `findBlogPostBySlug` e `listBlogTags` wrappados com `cache()`
- `src/lib/data/leads.data.ts` — `getLead` wrappado com `cache()`

**Arquivos modificados:**
- `src/app/[locale]/blog/[slug]/page.tsx` — usa `findBlogPostBySlug` (deduplicado)
- `src/app/[locale]/(protected)/leads/[id]/page.tsx` — usa `getLead` de `leads.data.ts`
- `src/components/blog/TagNavigation.tsx` — usa `listBlogTags` (deduplicado)

**Resultado:** 4 queries Prisma eliminadas por deduplicação (2 por slug page + 2 por lead detail page).

---

## T002 — Conflito revalidate + searchParams ✅

**Problema:** `export const revalidate = BLOG_REVALIDATE` + `await searchParams` em 2 páginas de blog. Em Next.js 15 App Router, `searchParams` força dynamic rendering, anulando completamente o ISR — o revalidate era ignorado.

**Arquivos modificados:**
- `src/app/[locale]/blog/page.tsx` — substituído por `export const dynamic = 'force-dynamic'`
- `src/app/[locale]/blog/tags/[tag]/page.tsx` — idem

**Resultado:** Comportamento de cache agora é explícito e correto. As páginas renderizam dinamicamente (via searchParams para paginação), sem confusão de config.

---

## T003 — Waterfall blog/page + Suspense para TagNavigation ✅

**Problema:** Em `blog/page.tsx`, `blogService.listPublished` era awaited sequencialmente; depois, `<TagNavigation>` awaita `blogService.listAllTags()` no próprio render — 2 queries sequenciais.

**Solução:**
- `TagNavigation` agora usa `listBlogTags()` (de `blog.data.ts`) wrappado com `React.cache()`
- `<TagNavigation>` envolvido em `<Suspense fallback={null}>` em `blog/page.tsx` — não bloqueia artigos principais
- Com `React.cache()`, chamadas idênticas no mesmo request são deduplicadas automaticamente

**Resultado:** Tags carregam em paralelo/não-bloqueante após artigos principais. Waterfall eliminado.

---

## T004 — unstable_cache para protected layout ✅

**Problema:** `getServerData()` no protected layout executava `prisma.reconciliationItem.count()` a cada navegação dentro da área protegida — query sem cache em toda request.

**Arquivo modificado:** `src/app/[locale]/(protected)/layout.tsx`

**Solução:**
```typescript
const getCachedReconciliationCount = unstable_cache(
  async () => prisma.reconciliationItem.count(...).catch(() => 0),
  ['reconciliation-pending-count'],
  { tags: ['reconciliation-count'], revalidate: 60 }
)
```

**Resultado:** Query cacheada por 60s. Revalidação on-demand via `revalidateTag('reconciliation-count')` disponível para quando reconciliações forem resolvidas.

---

## Cache Strategy Final

| Rota | Estratégia | Configuração |
|------|------------|--------------|
| `[locale]/blog/[slug]/page` | ISR | `revalidate = BLOG_REVALIDATE` (3600s) |
| `[locale]/blog/page` | Dynamic | `force-dynamic` (paginação via searchParams) |
| `[locale]/blog/tags/[tag]/page` | Dynamic | `force-dynamic` (paginação via searchParams) |
| `[locale]/page` | Dynamic | `force-dynamic` (redirect de auth) |
| `[locale]/(protected)/*` | Dynamic | `force-dynamic` herdado do layout |
| `reconciliationItem.count` | unstable_cache | TTL 60s, tag `reconciliation-count` |
| `blogService.findBySlug` | React.cache | Deduplicação por request |
| `blogService.listAllTags` | React.cache | Deduplicação por request |
| `getLead` | React.cache | Deduplicação por request |

---

## Checklist Final

### Cache
- [x] `React.cache()` em funções de dados críticos
- [x] `unstable_cache` para query de banco no layout protegido
- [x] Tags configuradas para revalidação granular (`reconciliation-count`)
- [x] Sem conflito `revalidate` + `searchParams`
- [x] Blog slug page mantém ISR correto (sem searchParams)

### Waterfall
- [x] Waterfall `listPublished` → `listAllTags` eliminado via Suspense
- [x] Nenhum await sequencial desnecessário nas pages analisadas

### Deduplication
- [x] `generateMetadata` + page component sem query duplicada (T001)
- [x] `TagNavigation` usa função memoizada (T003)

### Streaming
- [x] `<TagNavigation>` com Suspense em `blog/page.tsx`

### Route Config
- [x] `force-dynamic` explícito onde necessário
- [x] Sem `force-dynamic` desnecessário
- [x] ISR preservado em `blog/[slug]/page.tsx`

---

## Notas Adicionais

**Fora do escopo deste teste (encaminhar para outros comandos):**
- `content/page.tsx` (`'use client'`): N+1 HTTP requests — `/nextjs:boundaries`
- `useEffect + fetch` em client components — `/nextjs:boundaries`
- `TagNavigation` skeleton (fallback `null` é funcional mas pode melhorar) — `/nextjs:nextjs-components`
