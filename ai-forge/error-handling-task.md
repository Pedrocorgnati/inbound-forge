# Error Handling Tasks — Inbound Forge
_Gerado por `/nextjs:error-handling` em 2026-04-05_

---

### T001 – global-error.tsx ausente
**Status:** COMPLETED
**Tipo:** SEQUENTIAL
**Dependências:** none
**Arquivos:**
- criar: `src/app/global-error.tsx`

**Descrição:** Não existe `global-error.tsx` na raiz. Falhas no `src/app/layout.tsx` (ex: providers, middleware, DB init) não são capturadas por nenhum boundary — o usuário vê a tela de erro padrão do Next.js sem logging nem recovery.

**Critérios de Aceite:**
- `global-error.tsx` criado com `'use client'`, `<html>` + `<body>` autônomos (sem dependências externas)
- `useEffect` chama `captureException` do Sentry com `error.digest`
- Botão reset e link para home
- Sem referência a componentes que possam falhar (zero imports de `/components`)

**Estimativa:** 30min

---

### T002 – error.tsx usa console.error em vez de captureException
**Status:** COMPLETED
**Tipo:** PARALLEL-GROUP-1
**Dependências:** none
**Arquivos:**
- modificar: `src/app/error.tsx`
- modificar: `src/app/[locale]/error.tsx`

**Descrição:** Ambos os boundaries usam `console.error(error)` no `useEffect`. O Sentry já está configurado (`src/lib/sentry.ts` exporta `captureException`). Erros no client não chegam ao Sentry com contexto (digest, rota, userId).

**Critérios de Aceite:**
- `useEffect` chama `captureException(error, { digest: error.digest, route: pathname })` importando de `@/lib/sentry`
- `console.error` removido
- `usePathname()` de `next/navigation` fornece contexto de rota

**Estimativa:** 20min

---

### T003 – error.tsx granular ausente em rotas protegidas
**Status:** COMPLETED
**Tipo:** PARALLEL-GROUP-1
**Dependências:** none
**Arquivos:**
- criar: `src/app/[locale]/(protected)/dashboard/error.tsx`
- criar: `src/app/[locale]/(protected)/content/error.tsx`
- criar: `src/app/[locale]/(protected)/analytics/error.tsx`
- criar: `src/app/[locale]/(protected)/leads/error.tsx`
- criar: `src/app/[locale]/(protected)/knowledge/error.tsx`

**Descrição:** Nenhuma rota protegida tem `error.tsx` próprio. Todos caem no `[locale]/error.tsx` genérico sem mensagem contextual nem link de recovery adequado (ex: "Voltar para Leads").

**Critérios de Aceite:**
- Cada `error.tsx` com mensagem contextual e link de recovery para a seção
- `captureException` com rota no contexto
- Botão reset + link contextual

**Estimativa:** 45min

---

### T004 – console.error em server actions (leads.ts + knowledge.ts)
**Status:** COMPLETED
**Tipo:** PARALLEL-GROUP-2
**Dependências:** none
**Arquivos:**
- modificar: `src/actions/leads.ts`
- modificar: `src/actions/knowledge.ts`

**Descrição:** 21+ ocorrências de `console.error` em server actions. Em produção, esses logs não chegam ao Sentry e ficam apenas nos logs do servidor sem contexto (userId, rota, digest). O Sentry já está disponível via `captureException` em `@/lib/sentry`.

**Critérios de Aceite:**
- Todos os `console.error('[getLeads]', err)` substituídos por `captureException(err, { action: 'getLeads' })`
- Mesmo padrão para todas as funções em ambos os arquivos
- Nenhum `console.error` restante (exceto os de validação de ENV que são aceitáveis em startup)

**Estimativa:** 30min

---

### T005 – console.error em serviços de lib
**Status:** COMPLETED
**Tipo:** PARALLEL-GROUP-2
**Dependências:** none
**Arquivos:**
- modificar: `src/lib/services/channel-adaptation.service.ts`
- modificar: `src/lib/services/visual-asset.service.ts`
- modificar: `src/lib/services/angle-generation.service.ts`
- modificar: `src/lib/services/content-approval.service.ts`
- modificar: `src/lib/services/thumbnail.service.ts`
- modificar: `src/lib/instagram/queue-manager.ts`
- modificar: `src/services/theme-generation.service.ts`
- modificar: `src/services/theme-scoring.service.ts`

**Descrição:** Serviços críticos (geração de conteúdo, Instagram, assets visuais) usam `console.error` sem envio ao Sentry. Falhas silenciosas em produção.

**Critérios de Aceite:**
- `console.error` substituído por `captureException` com contexto adequado (serviceId, entityId)
- Para erros não-críticos marcados como "(não crítico)", usar `captureMessage` com level `'warning'`

**Estimativa:** 40min

---

### T006 – api/log-error ausente (client-side error logging)
**Status:** COMPLETED
**Tipo:** SEQUENTIAL
**Dependências:** T002
**Arquivos:**
- criar: `src/app/api/log-error/route.ts`

**Descrição:** Sem endpoint para receber erros do cliente. `error.tsx` (client component) não consegue enviar erros ao servidor com contexto. A rota deve receber `{ digest, message, route, userId? }` e chamar `captureException`.

**Critérios de Aceite:**
- `POST /api/log-error` aceita `{ digest, message, route }` (userId vem da sessão, não do body)
- Valida input com Zod
- Chama `captureException` com contexto sanitizado
- Retorna `{ ok: true }` — nunca 5xx

**Estimativa:** 30min

---

### T007 – leads/[id]/page.tsx sem notFound() no server
**Status:** COMPLETED
**Tipo:** PARALLEL-GROUP-3
**Dependências:** none
**Arquivos:**
- modificar: `src/app/[locale]/(protected)/leads/[id]/page.tsx`

**Descrição:** `generateMetadata` faz fetch do lead e retorna "Lead não encontrado" como título quando o lead não existe, mas a `page` renderiza `<LeadDetailClient />` sem verificar se o recurso existe. Se o ID for inválido, o componente cliente recebe 404 da API e exibe erro inline — mas o correto seria redirecionar para `not-found.tsx` via `notFound()`.

**Critérios de Aceite:**
- `page.tsx` converte-se em async server component que faz fetch do lead
- Se `null`, chama `notFound()`
- Passa dados ao `LeadDetailClient` como props (ou mantém fetch no client com fallback adequado)
- `not-found.tsx` específico para leads criado com link de volta à lista

**Estimativa:** 45min

---

### T008 – loading.tsx ausente em rotas de detalhe
**Status:** COMPLETED
**Tipo:** PARALLEL-GROUP-3
**Dependências:** none
**Arquivos:**
- criar: `src/app/[locale]/(protected)/leads/[id]/loading.tsx`
- criar: `src/app/[locale]/(protected)/content/[themeId]/loading.tsx`

**Descrição:** Rotas de detalhe com fetch (`leads/[id]`, `content/[themeId]`) não têm `loading.tsx`. O `(protected)/loading.tsx` genérico é exibido, mas não reflete a estrutura real da página (ex: content editor tem layout muito diferente de um card genérico).

**Critérios de Aceite:**
- `leads/[id]/loading.tsx` com skeleton espelhando o layout de detalhes (header + cards + lista)
- `content/[themeId]/loading.tsx` com skeleton do editor de conteúdo (coluna + painel lateral)

**Estimativa:** 30min
