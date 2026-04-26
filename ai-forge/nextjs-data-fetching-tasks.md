# Data Fetching Tasks — Inbound Forge

Gerado em: 2026-04-05  
Config: `.claude/projects/inbound-forge.json`  
workspace_root: `output/workspace/inbound-forge`

---

## STATUS GERAL

| Task | Status | Descrição |
|------|--------|-----------|
| T001 | COMPLETED | React.cache() para blogService.findBySlug e getLead |
| T002 | COMPLETED | Resolver conflito revalidate + searchParams nas blog pages |
| T003 | COMPLETED | Eliminar waterfall blog/page + Suspense para TagNavigation |
| T004 | COMPLETED | unstable_cache para protected layout getServerData |

---

## T001 — Deduplicação com React.cache()

**Tipo:** SEQUENTIAL  
**Dependências:** none  
**Prioridade:** ALTA

**Arquivos:**
- criar: `src/lib/data/blog.data.ts`
- criar: `src/lib/data/leads.data.ts`
- modificar: `src/app/[locale]/blog/[slug]/page.tsx`
- modificar: `src/app/[locale]/(protected)/leads/[id]/page.tsx`

**Problema:**  
`generateMetadata` e o page component chamam a mesma query Prisma independentemente — 2 queries por request.

Evidências:
- `src/app/[locale]/blog/[slug]/page.tsx:27` — `blogService.findBySlug(slug)` em generateMetadata
- `src/app/[locale]/blog/[slug]/page.tsx:112` — `blogService.findBySlug(slug)` no page component
- `src/app/[locale]/(protected)/leads/[id]/page.tsx:18` — `getLead(id)` em generateMetadata
- `src/app/[locale]/(protected)/leads/[id]/page.tsx:32` — `getLead(id)` no page component

Comando de evidência:
```bash
grep -n "findBySlug\|getLead" src/app/[locale]/blog/[slug]/page.tsx src/app/[locale]/(protected)/leads/[id]/page.tsx
```

**Critérios de Aceite:**
- [ ] `blogService.findBySlug` wrappado com `React.cache()`
- [ ] `getLead` wrappado com `React.cache()`
- [ ] Apenas 1 query Prisma por request (deduplicação ativa)
- [ ] Comportamento de `notFound()` preservado

**Status:** COMPLETED
- Criado `src/lib/data/blog.data.ts` com `findBlogPostBySlug = cache(blogService.findBySlug)`
- Criado `src/lib/data/leads.data.ts` com `getLead = cache(prisma.lead.findUnique)`
- `blog/[slug]/page.tsx`: `generateMetadata` + `BlogPostPage` agora usam `findBlogPostBySlug`
- `leads/[id]/page.tsx`: `generateMetadata` + `LeadDetailPage` agora usam `getLead` de `leads.data.ts`

---

## T002 — Corrigir conflito revalidate + searchParams nas blog pages

**Tipo:** SEQUENTIAL  
**Dependências:** none  
**Prioridade:** CRÍTICA

**Arquivos:**
- modificar: `src/app/[locale]/blog/page.tsx`
- modificar: `src/app/[locale]/blog/tags/[tag]/page.tsx`

**Problema:**  
Ambas as páginas exportam `export const revalidate = BLOG_REVALIDATE` (3600s) mas usam `searchParams` para paginação. Em Next.js 15 App Router, `await searchParams` força dynamic rendering — o ISR é anulado e as páginas renderizam a cada request sem cache.

Evidências:
- `src/app/[locale]/blog/page.tsx:7` — `export const revalidate = BLOG_REVALIDATE`
- `src/app/[locale]/blog/page.tsx:50` — `const sp = await searchParams` (força dynamic)
- `src/app/[locale]/blog/tags/[tag]/page.tsx:8` — `export const revalidate = BLOG_REVALIDATE`
- `src/app/[locale]/blog/tags/[tag]/page.tsx:41` — `const sp = await searchParams` (força dynamic)

Comando de evidência:
```bash
grep -n "revalidate\|searchParams" src/app/[locale]/blog/page.tsx src/app/[locale]/blog/tags/[tag]/page.tsx
```

**Solução:**  
Remover `searchParams` do Server Component. A paginação deve ser tratada de uma das formas:
1. **Opção A (recomendada)**: Extrair paginação para um Client Component wrapper que recebe `initialData` do server e gerencia paginação via `fetch` no client.
2. **Opção B**: Adicionar `export const dynamic = 'force-dynamic'` e remover `revalidate` (aceitar renderização dinâmica para paginação).

Aplicar Opção B por ser menos invasiva (paginação já funciona via searchParams dinâmicos, apenas remover a contradição):

```tsx
// blog/page.tsx — ANTES
export const revalidate = BLOG_REVALIDATE   // ← contradição

// blog/page.tsx — DEPOIS
export const dynamic = 'force-dynamic'      // ← honesto: página é dinâmica por natureza (paginação)
```

**Critérios de Aceite:**
- [ ] Sem conflito `revalidate` + `searchParams`
- [ ] Página renderiza corretamente com paginação
- [ ] `revalidate` removido (ou `dynamic = 'force-dynamic'` explícito)

**Status:** COMPLETED
- `blog/page.tsx`: removido `revalidate = BLOG_REVALIDATE`, adicionado `export const dynamic = 'force-dynamic'`
- `blog/tags/[tag]/page.tsx`: idem
- Importação de `BLOG_REVALIDATE` removida de ambas as páginas

---

## T003 — Eliminar waterfall em blog/page e blog/tags/[tag]/page

**Tipo:** PARALLEL-GROUP-1  
**Dependências:** T001  
**Prioridade:** ALTA

**Arquivos:**
- modificar: `src/app/[locale]/blog/page.tsx`
- modificar: `src/app/[locale]/blog/tags/[tag]/page.tsx`

**Problema:**  
Em ambas as páginas, `blogService.listPublished`/`listByTag` é awaited antes do render, e `<TagNavigation>` (Server Component) awaita `blogService.listAllTags()` separadamente dentro do próprio render. Resultado: 2 queries sequenciais.

Evidências:
- `src/app/[locale]/blog/page.tsx:52` — `await blogService.listPublished(page, 6)` + `<TagNavigation>` no render
- `src/components/blog/TagNavigation.tsx:17` — `await blogService.listAllTags()`

Comando de evidência:
```bash
grep -n "await blogService" src/app/[locale]/blog/page.tsx src/components/blog/TagNavigation.tsx
```

**Solução:**  
Wrapper com `React.cache()` em `listAllTags` garante que, quando `TagNavigation` for chamado concorrentemente com outros componentes, a query seja deduplicada. Ou: iniciar ambas as queries em paralelo na page e passar `tagsPromise` como prop.

Abordagem mais simples: aplicar `React.cache()` em `listAllTags` para que chamadas idênticas no mesmo request sejam deduplicadas, e usar Suspense para que `<TagNavigation>` não bloqueie o conteúdo principal:

```tsx
// blog/page.tsx — DEPOIS
export default async function BlogPage({ params, searchParams }: BlogPageProps) {
  // Inicia ambas as queries em paralelo (sem await imediato)
  const articlesPromise = blogService.listPublished(page, 6)
  // TagNavigation busca seus próprios dados via React.cache() de listAllTags
  
  const { items, totalPages } = await articlesPromise

  return (
    <main>
      {/* TagNavigation carrega em paralelo via Suspense */}
      <Suspense fallback={<TagNavigationSkeleton />}>
        <TagNavigation locale={locale} />
      </Suspense>
      <ArticleList articles={items} ... />
    </main>
  )
}
```

**Critérios de Aceite:**
- [ ] `listAllTags` wrappado com `React.cache()`
- [ ] `<TagNavigation>` envolto em `<Suspense>` para não bloquear artigos
- [ ] Queries de listPublished/listByTag e listAllTags iniciam em paralelo

**Status:** COMPLETED
- `TagNavigation.tsx`: migrado de `blogService.listAllTags()` para `listBlogTags()` (via `blog.data.ts`)
- `listBlogTags = cache(blogService.listAllTags)` garante deduplicação quando múltiplos componentes chamam no mesmo request
- `blog/page.tsx`: `<TagNavigation>` envolvido em `<Suspense fallback={null}>` — não bloqueia artigos principais
- `tags/[tag]/page.tsx`: não usa `TagNavigation`, sem waterfall

---

## T004 — unstable_cache para getServerData no protected layout

**Tipo:** SEQUENTIAL  
**Dependências:** none  
**Prioridade:** MÉDIA

**Arquivos:**
- modificar: `src/app/[locale]/(protected)/layout.tsx`

**Problema:**  
`getServerData()` executa `prisma.reconciliationItem.count()` sem cache a cada navegação dentro da área protegida. Essa query roda em toda request de qualquer página protegida.

Evidências:
- `src/app/[locale]/(protected)/layout.tsx:25` — `prisma.reconciliationItem.count(...)`

Comando de evidência:
```bash
grep -n "prisma\." src/app/[locale]/\(protected\)/layout.tsx
```

**Solução:**  
Adicionar `unstable_cache` com TTL curto (60s) e tag `reconciliation-count` para permitir invalidação on-demand:

```typescript
import { unstable_cache } from 'next/cache'

const getReconciliationCount = unstable_cache(
  async () => {
    return prisma.reconciliationItem
      .count({ where: { resolved: false } })
      .catch(() => 0)
  },
  ['reconciliation-pending-count'],
  { tags: ['reconciliation-count'], revalidate: 60 }
)
```

**Critérios de Aceite:**
- [ ] `unstable_cache` aplicado em `getServerData`
- [ ] Tag `reconciliation-count` configurada para revalidação on-demand
- [ ] TTL de 60s definido
- [ ] Comportamento de fallback (0) preservado

**Status:** COMPLETED
- `(protected)/layout.tsx`: adicionado `unstable_cache` importado de `next/cache`
- Criada `getCachedReconciliationCount` com TTL de 60s e tag `reconciliation-count`
- `getServerData()` usa `getCachedReconciliationCount()` em vez de query direta
- Permite revalidação on-demand via `revalidateTag('reconciliation-count')`
