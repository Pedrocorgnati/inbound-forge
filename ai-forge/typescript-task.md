# TypeScript Audit — Inbound Forge

**Data:** 2026-04-06  
**Resultado do `tsc --noEmit` inicial:** PASSOU (0 erros)  
**Problemas encontrados:** `as unknown as` espalhados, casts desnecessários, ausência de optional chaining, `noUncheckedIndexedAccess` desabilitado.

---

## T001 – Remover casts desnecessários em blog-version.service.ts
**Tipo:** PARALLEL-GROUP-A  
**Dependências:** none  
**Arquivos:**
- modificar: `src/lib/services/blog-version.service.ts`

**Descrição:** O tipo Prisma `BlogArticleVersion` gerado (id, articleId, versionNumber, title, body, changeNote: string | null, createdAt) é estruturalmente compatível com a interface `BlogArticleVersion` em `types/blog.ts`. Os 3 casts `as unknown as BlogArticleVersion` são desnecessários.  
**Critérios de Aceite:** 0 ocorrências de `as unknown as` em `blog-version.service.ts`.  
**Estimativa:** 0.25h  
**Status:** ✅ COMPLETED

---

## T002 – Criar `BlogArticleSummary` e `PaginatedArticleSummaries` em types/blog.ts
**Tipo:** PARALLEL-GROUP-A  
**Dependências:** none  
**Arquivos:**
- modificar: `src/types/blog.ts`

**Descrição:** As funções de listagem pública (`listPublished`, `listByTag`) usam `publicListSelect` que NÃO inclui `body`, `hreflang`, `canonicalUrl` etc. O tipo de retorno `PaginatedArticles` com `items: BlogArticle[]` é incorreto — os itens são parciais. Criação de `BlogArticleSummary = Pick<BlogArticle, ...>` e `PaginatedArticleSummaries` corrige o contrato sem refatorar o serviço inteiro.  
**Critérios de Aceite:** Novos tipos exportados e usados nos componentes de listagem.  
**Estimativa:** 0.25h  
**Status:** ✅ COMPLETED

---

## T003 – Mapper `mapBlogArticle` para eliminar `as unknown as BlogArticle` (10 ocorrências)
**Tipo:** PARALLEL-GROUP-B  
**Dependências:** T002  
**Arquivos:**
- modificar: `src/lib/services/blog-admin.service.ts`
- modificar: `src/lib/services/blog.service.ts`

**Descrição:** A raiz dos 10 casts `as unknown as BlogArticle` é a incompatibilidade entre `hreflang: Prisma.JsonValue | null` (tipo Prisma) e `hreflang?: HreflangConfig | null` (interface de domínio). Um helper local `mapBlogArticle` faz o único cast necessário e documenta a razão, eliminando os casts espalhados.  
**Critérios de Aceite:** 0 ocorrências de `as unknown as BlogArticle` nos serviços de blog.  
**Estimativa:** 0.5h  
**Status:** ✅ COMPLETED

---

## T004 – Substituir `globalThis as unknown as` em prisma.ts por `declare global`
**Tipo:** PARALLEL-GROUP-A  
**Dependências:** none  
**Arquivos:**
- modificar: `src/lib/prisma.ts`

**Descrição:** O padrão `globalThis as unknown as { prisma: PrismaClient | undefined }` pode ser substituído pelo padrão oficial Prisma Next.js com `declare global { var prisma: PrismaClient | undefined }`, eliminando o único `as unknown as` restante fora dos serviços de blog.  
**Critérios de Aceite:** Sem `as unknown as` em `prisma.ts`.  
**Estimativa:** 0.1h  
**Status:** ✅ COMPLETED

---

## T005 – Optional chaining em `issues[0]` nos routes de posts
**Tipo:** PARALLEL-GROUP-A  
**Dependências:** none  
**Arquivos:**
- modificar: `src/app/api/posts/[id]/route.ts`
- modificar: `src/app/api/posts/[id]/schedule/route.ts`
- modificar: `src/app/api/posts/route.ts`
- modificar: `src/app/api/posts/from-content/route.ts`

**Descrição:** Quatro routes acessam `error.issues[0].message` sem optional chaining após `if (error instanceof ZodError)`. O `ZodError` sempre tem `issues` não-vazio na prática, mas a ausência de `?.` é inconsistente com outros routes que já usam `issues[0]?.message ?? 'Dados inválidos'`. Necessário para habilitar `noUncheckedIndexedAccess` no futuro.  
**Critérios de Aceite:** Todos os acessos `issues[0]` usam optional chaining.  
**Estimativa:** 0.25h  
**Status:** ✅ COMPLETED

---

## T006 – Atualizar ArticleCard e ArticleList para `BlogArticleSummary`
**Tipo:** PARALLEL-GROUP-B  
**Dependências:** T002  
**Arquivos:**
- modificar: `src/components/blog/ArticleCard.tsx`
- modificar: `src/components/blog/ArticleList.tsx`

**Descrição:** Os componentes de listagem pública recebem artigos do tipo `BlogArticleSummary` (sem body), mas declaravam props como `BlogArticle`. Atualizar para refletir o contrato real.  
**Critérios de Aceite:** Props dos componentes usam `BlogArticleSummary`.  
**Estimativa:** 0.1h  
**Status:** ✅ COMPLETED

---

## T007 – [PENDENTE] Adicionar `noUncheckedIndexedAccess: true` ao tsconfig
**Tipo:** SEQUENTIAL  
**Dependências:** T005  
**Arquivos:**
- modificar: `tsconfig.json`
- modificar: ~12 arquivos com erros resultantes

**Descrição:** O flag `noUncheckedIndexedAccess` não é coberto por `strict: true`. Adicioná-lo revelou ~40 erros ao testar com `npx tsc --noEmit --noUncheckedIndexedAccess`. Clusters principais: `components/analytics/SparklineChart*.tsx`, `components/calendar/`, `components/content/VersionDiff.tsx`, `components/onboarding/`, `hooks/useDragReschedule.ts`, `lib/analytics-queries.ts`. Recomendado como próxima iteração de TypeScript.  
**Critérios de Aceite:** `tsc --noEmit` limpo com `noUncheckedIndexedAccess: true`.  
**Estimativa:** 2h  
**Status:** ⏳ PENDENTE — necessita iteração dedicada

---

## Métricas Finais

| Métrica | Antes | Depois |
|---------|-------|--------|
| `as unknown as` (prod) | 14 | 1 (cast de hreflang documentado no mapper) |
| Casts desnecessários | 3 | 0 |
| Optional chaining faltando (`issues[0]`) | 4 | 0 |
| `tsc --noEmit` | ✅ PASSOU | ✅ PASSOU |
| `strict: true` | ✅ | ✅ |
| `noUncheckedIndexedAccess` | ❌ | ❌ (T007 pendente) |
