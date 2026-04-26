# Server Actions — Task List

**Gerado em:** 2026-04-05
**Config:** .claude/projects/inbound-forge.json
**Status geral:** IN_PROGRESS

---

## T001 — Criar src/lib/action-utils.ts com ActionResult padronizado
**Tipo:** SEQUENTIAL
**Dependências:** none
**Status:** COMPLETED ✅
**Arquivos:**
- criado: `src/lib/action-utils.ts`

**Problema:** Não existe tipo ActionResult padronizado. Cada arquivo de actions retorna shapes inconsistentes (`{ data }`, `{ error }`, `{ success: true }`, `null`, `[]`), impossibilitando tipagem segura no consumidor e uso com `useActionState`.

**Critérios de Aceite:**
- [ ] `ActionResult<T>` exportado
- [ ] `actionSuccess`, `actionError`, `getErrorMessage` helpers exportados
- [ ] `initialActionState` exportado
- [ ] Sem `'use server'` (é lib pura, não action)
- [ ] Compilação TS sem erros

---

## T002 — Adicionar auth às read actions (knowledge.ts + leads.ts + analytics.ts)
**Tipo:** SEQUENTIAL
**Dependências:** none
**Status:** COMPLETED ✅
**Arquivos:**
- modificar: `src/actions/knowledge.ts`
- modificar: `src/actions/leads.ts`
- modificar: `src/actions/analytics.ts`

**Problema:**
- `getContentPerformance()` em analytics.ts: SEM auth — crítico
- `getCases, getPains, getPatterns, getObjections` em knowledge.ts: sem verificação de sessão
- `getLeads, getLead, getConversions, getAttribution` em leads.ts: sem verificação de sessão
- analytics.ts retorna `null`/`[]` em falha de auth em vez de padrão consistente

**Critérios de Aceite:**
- [ ] Todas as read actions verificam sessão antes de executar query
- [ ] `getContentPerformance()` tem auth check
- [ ] Auth failures retornam padrão consistente `{ error: 'Não autorizado' }`
- [ ] Sem exposição de dados para usuários não autenticados

---

## T003 — Corrigir atomicidade de deleteLead (transaction)
**Tipo:** SEQUENTIAL
**Dependências:** none
**Status:** COMPLETED ✅
**Arquivos:**
- modificar: `src/actions/leads.ts`

**Problema:** `deleteLead()` deleta o lead (`prisma.lead.delete`) e depois chama `updateThemeConversionScore()` sem transação. Se o score update falhar, o lead já foi deletado sem rollback — inconsistência de dados.

**Critérios de Aceite:**
- [ ] `prisma.lead.delete` + `updateThemeConversionScore` dentro de `prisma.$transaction`
- [ ] Rollback automático se qualquer etapa falhar
- [ ] Audit log ainda funciona (manter após transação)

---

## T004 — Padronizar retornos com ActionResult em knowledge.ts + leads.ts
**Tipo:** SEQUENTIAL
**Dependências:** T001
**Status:** COMPLETED ✅
**Arquivos:**
- modificar: `src/actions/knowledge.ts`
- modificar: `src/actions/leads.ts`

**Problema:** Retornos inconsistentes. Mutations retornam `{ data: X }` ou `{ error: string }` ou `{ success: true }`, sem tipo unificado. Impossível consumir com `useActionState` ou tipar no cliente.

**Critérios de Aceite:**
- [ ] Todas as mutations usam `ActionResult<T>` de action-utils
- [ ] `actionSuccess()` e `actionError()` helpers usados consistentemente
- [ ] `getOperatorId()` — error rethrow mantido (padrão atual OK)
- [ ] Compilação TS sem erros

---

## T005 — Adicionar rate limiting a createLead
**Tipo:** SEQUENTIAL
**Dependências:** none
**Status:** COMPLETED ✅
**Arquivos:**
- modificar: `src/actions/leads.ts`

**Problema:** `createLead` recebe PII (nome, empresa, contato) e grava no banco sem rate limiting. Um atacante pode poluir a base de leads ou fazer abuse. Rate limiter Redis já existe em `src/lib/utils/redis-rate-limiter.ts`.

**Critérios de Aceite:**
- [ ] `createLead` checa rate limit antes de processar
- [ ] Retorna erro user-friendly se limite excedido
- [ ] Usa `checkRateLimit` existente em `src/lib/utils/redis-rate-limiter.ts`

---

## T006 — Adicionar revalidateTag às mutations de knowledge + leads
**Tipo:** PARALLEL-GROUP-1
**Dependências:** none
**Status:** COMPLETED ✅ (executado junto com T004)
**Arquivos:**
- modificar: `src/actions/knowledge.ts`
- modificar: `src/actions/leads.ts`

**Problema:** Apenas `revalidatePath` usado. Sem `revalidateTag`, não é possível invalidar cache granular (ex: lista de cases sem invalidar a page inteira). Dificulta performance em RSC com `unstable_cache`.

**Critérios de Aceite:**
- [ ] Tags definidas: `'cases'`, `'pains'`, `'patterns'`, `'objections'`, `'leads'`
- [ ] `revalidateTag` chamado nas mutations correspondentes
- [ ] `revalidatePath` mantido (redundância intencional para cobrir SSR)
