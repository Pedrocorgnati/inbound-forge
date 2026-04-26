# Nextjs Architecture Report
**Data:** 2026-04-05
**Repo:** output/workspace/inbound-forge

---

## Resumo Executivo

Auditoria de arquitetura focada em DRY violations, naming conventions e consolidação do service layer. 7 tasks executadas, todas concluídas. TypeScript válido (zero erros novos introduzidos — 2 erros pré-existentes em `cost-tracking.ts` e `reconciliation/route.ts` fora do escopo).

---

## Problemas Detectados e Corrigidos

### T001 ✅ — SECTOR_OPTIONS duplicado
**Evidência:** `grep -n "SECTOR_OPTIONS" src/components/knowledge/PainForm.tsx PainList.tsx`
- PainForm.tsx:28-40 e PainList.tsx:29-43 continham definição idêntica de 10 opções de setor
**Ação:** Criado `src/constants/knowledge.ts` com `SECTOR_OPTIONS` e `SECTOR_FILTER_OPTIONS`
**Linhas eliminadas:** ~24 linhas duplicadas

### T002 ✅ — interface PaginationData duplicada em 4 arquivos
**Evidência:** `grep -rn "interface PaginationData" src/`
- Definida localmente em: PainList.tsx:21, PatternList.tsx:21, CaseList.tsx:20, LeadsList.tsx:21
**Ação:** Criado `src/lib/types/pagination.ts` — 4 arquivos importam dali
**Linhas eliminadas:** ~30 linhas duplicadas

### T003 ✅ — post.service stub obsoleto
**Evidência:** `grep -rn "from '@/services/post.service'" src/`
- Nenhum arquivo importava o stub `src/services/post.service.ts` (32 linhas de stubs)
- Todos os 7 routes em `/api/posts/` usavam `@/lib/services/post.service`
**Ação:** Arquivo removido

### T004 ✅ — Hooks com naming inconsistente (kebab-case → camelCase)
**Evidência:** `ls src/hooks/*.ts` — 4 arquivos em kebab-case, 18 em camelCase
- Renomeados: `use-auth.ts`, `use-debounce.ts`, `use-pagination.ts`, `use-sidebar-state.ts`
**Ação:** Renomeados para camelCase + importadores atualizados
- `src/components/layout/header.tsx`
- `src/components/auth/login-form.tsx`
- `src/components/layout/app-shell.tsx`
- `src/hooks/index.ts`

### T005 ✅ — Padrão autosave duplicado em 4 forms (useKnowledgeAutosave)
**Evidência:** `grep -rln "useAutosave" src/components/knowledge/`
- 22 linhas idênticas de autosave em: PainForm, ObjectionForm, PatternForm, CaseForm
**Ação:** Criado `src/hooks/useKnowledgeAutosave.ts` — hook genérico `useKnowledgeAutosave<T>`
**Linhas eliminadas:** ~66 linhas duplicadas (22 × 3 forms + ajuste do CaseForm)

### T006 ✅ — Padrão fetch/CRUD list duplicado em 4 Lists (useKnowledgeList)
**Evidência:** Estrutura de estado e fetch idêntica em PainList, CaseList, PatternList, ObjectionList
- ~60 linhas de estado/fetch duplicado por componente
**Ação:** Criado `src/hooks/useKnowledgeList.ts` — hook genérico `useKnowledgeList<T extends {id: string}>`
**Componentes refatorados:** PainList, CaseList, PatternList
- ObjectionList não foi refatorado (estrutura de groupBy por tipo difere)
**Linhas eliminadas:** ~120 linhas de lógica duplicada

### T007 ✅ — Service layer dividido (src/services/ + src/lib/services/)
**Evidência:** 2 pastas de services com propósito sobrepostos
- `src/services/`: 6 arquivos (após remoção do stub)
- `src/lib/services/`: 28 arquivos
**Ação:** 5 services movidos para `src/lib/services/` + `src/services/` removida
- Importadores atualizados: 4 routes + 2 test files

---

## Métricas

| Métrica | Valor |
|---------|-------|
| Linhas duplicadas eliminadas | ~240 |
| Novos arquivos criados | 4 (`knowledge.ts`, `pagination.ts`, `useKnowledgeAutosave.ts`, `useKnowledgeList.ts`) |
| Arquivos modificados | 22 |
| Arquivos removidos | 6 (`post.service.ts` stub + 5 services movidos) |
| Erros TypeScript introduzidos | 0 |

---

## Problemas Pré-Existentes (Fora do Escopo)

| Arquivo | Erro | Escopo |
|---------|------|--------|
| `src/lib/cost-tracking.ts` | `prisma.costLog` não existe — schema desatualizado | `/nextjs:typescript` |
| `src/app/api/v1/analytics/reconciliation/route.ts:109` | Expected 0-1 args, got 2 | `/nextjs:typescript` |

---

## Problemas Identificados Mas Não Corrigidos (Backlog)

| Prioridade | Problema | Componente | Recomendação |
|-----------|----------|-----------|-------------|
| Média | ObjectionList não usa useKnowledgeList | ObjectionList.tsx | Refatorar (estrutura groupBy difere, mas fetch/delete são iguais) |
| Baixa | LeadDetailClient 362 linhas, 8 useState | LeadDetailClient.tsx | Extrair hook `useLeadDetail` + dividir em subcomponentes |
| Baixa | AssetUploadZone 392 linhas | AssetUploadZone.tsx | Extrair `UploadProgressItem` como subcomponente |
| Info | Fetch direto em 20+ componentes | knowledge/, asset-library/, analytics/ | Candidato a extração de hooks de domínio (médio prazo) |

---

## Estrutura de Novos Arquivos

```
src/
├── constants/
│   └── knowledge.ts           ← SECTOR_OPTIONS + SECTOR_FILTER_OPTIONS
├── hooks/
│   ├── useAuth.ts             ← renomeado de use-auth.ts
│   ├── useDebounce.ts         ← renomeado de use-debounce.ts
│   ├── useKnowledgeAutosave.ts ← NOVO — abstrai autosave dos forms
│   ├── useKnowledgeList.ts    ← NOVO — abstrai fetch/CRUD dos lists
│   ├── usePagination.ts       ← renomeado de use-pagination.ts
│   └── useSidebarState.ts     ← renomeado de use-sidebar-state.ts
└── lib/
    ├── services/
    │   ├── analytics.service.ts      ← movido de src/services/
    │   ├── image.service.ts          ← movido de src/services/
    │   ├── niche-opportunity.service.ts ← movido de src/services/
    │   ├── theme-generation.service.ts  ← movido de src/services/
    │   └── theme-scoring.service.ts     ← movido de src/services/
    └── types/
        └── pagination.ts      ← PaginationData centralizado
```
