<metadata>
source: /nextjs:architecture code review
repo: output/workspace/inbound-forge
date: 2026-04-05
estimated-hours: 4
complexity: medium
config: .claude/projects/inbound-forge.json
</metadata>

<overview>
Refatoração focada em DRY violations, naming conventions e consolidação do service layer.
O projeto tem boa estrutura geral (ui/, shared/, hooks/, lib/services/) mas acumulou duplicações
nos domínios de knowledge (forms e lists) e inconsistências de nomenclatura.
</overview>

<task-list>

### T001 - Extrair SECTOR_OPTIONS para constants/knowledge
**Status:** COMPLETED
**Tipo:** PARALLEL-GROUP-1
**Dependências:** none
**Arquivos:**
- criar: `src/constants/knowledge.ts`
- modificar: `src/components/knowledge/PainForm.tsx`
- modificar: `src/components/knowledge/PainList.tsx`

**Descrição:**
`SECTOR_OPTIONS` está definido de forma idêntica em PainForm.tsx:28-39 e PainList.tsx:29-42.
Extrair para `src/constants/knowledge.ts` e importar de lá nos dois arquivos.

**Critérios de Aceite:**
- [ ] Arquivo `src/constants/knowledge.ts` criado com SECTOR_OPTIONS exportada
- [ ] PainForm.tsx importa de constants/knowledge
- [ ] PainList.tsx importa de constants/knowledge
- [ ] Build sem erros

---

### T002 - Extrair interface PaginationData para lib/types
**Status:** COMPLETED
**Tipo:** PARALLEL-GROUP-1
**Dependências:** none
**Arquivos:**
- criar: `src/lib/types/pagination.ts`
- modificar: `src/components/knowledge/PainList.tsx`
- modificar: `src/components/knowledge/PatternList.tsx`
- modificar: `src/components/knowledge/CaseList.tsx`
- modificar: `src/components/leads/LeadsList.tsx`

**Descrição:**
`interface PaginationData { page, limit, total, totalPages, hasMore }` está definida localmente
em 4 arquivos diferentes (linhas 21, 21, 20, 21 respectivamente). Extrair para `src/lib/types/pagination.ts`.

**Critérios de Aceite:**
- [ ] `PaginationData` exportada de `src/lib/types/pagination.ts`
- [ ] 4 arquivos importam de lib/types/pagination
- [ ] Build sem erros

---

### T003 - Remover stub post.service de src/services/
**Status:** COMPLETED
**Tipo:** PARALLEL-GROUP-1
**Dependências:** none
**Arquivos:**
- deletar: `src/services/post.service.ts`

**Descrição:**
`src/services/post.service.ts` (32 linhas) é um stub com métodos lançando
`throw new Error('Not implemented')`. O real está em `src/lib/services/post.service.ts` (168 linhas)
e já é usado por todos os 7 routes em `/api/posts/`. O stub nunca é importado.
Confirmar e deletar.

**Evidência:**
- grep mostra zero imports de `@/services/post.service` — todos usam `@/lib/services/post.service`

**Critérios de Aceite:**
- [ ] `src/services/post.service.ts` removido
- [ ] Nenhum import quebrado
- [ ] Build sem erros

---

### T004 - Padronizar naming de hooks para camelCase
**Status:** COMPLETED
**Tipo:** PARALLEL-GROUP-1
**Dependências:** none
**Arquivos:**
- renomear: `src/hooks/use-auth.ts` → `src/hooks/useAuth.ts`
- renomear: `src/hooks/use-debounce.ts` → `src/hooks/useDebounce.ts`
- renomear: `src/hooks/use-pagination.ts` → `src/hooks/usePagination.ts`
- renomear: `src/hooks/use-sidebar-state.ts` → `src/hooks/useSidebarState.ts`
- modificar: todos os importadores desses hooks

**Descrição:**
A pasta `src/hooks/` tem naming inconsistente. Maioria usa camelCase (`useAutosave.ts`, `useThemes.ts`)
mas 4 usam kebab-case (`use-auth.ts`, `use-debounce.ts`, `use-pagination.ts`, `use-sidebar-state.ts`).
Padronizar todos para camelCase.

**Critérios de Aceite:**
- [ ] 4 hooks renomeados para camelCase
- [ ] Todos os importadores atualizados
- [ ] Build sem erros

---

### T005 - Extrair hook useKnowledgeForm (autosave pattern)
**Status:** COMPLETED
**Tipo:** SEQUENTIAL
**Dependências:** T001
**Arquivos:**
- criar: `src/hooks/useKnowledgeForm.ts`
- modificar: `src/components/knowledge/PainForm.tsx`
- modificar: `src/components/knowledge/ObjectionForm.tsx`
- modificar: `src/components/knowledge/PatternForm.tsx`
- modificar: `src/components/knowledge/CaseForm.tsx`

**Descrição:**
O padrão autosave é idêntico nos 4 forms de knowledge (22 linhas duplicadas cada):
```
const formSerialized = useMemo(() => JSON.stringify(form), [form])
const autosaveFn = useCallback(async (data) => {
  if (!initialData?.id) return
  const res = await fetch(`/api/knowledge/${entity}/${id}`, { method: 'PATCH', ... })
}, [...])
useAutosave(autosaveFn, formSerialized, AUTOSAVE_DELAY)
```
Extrair para `useKnowledgeForm<T>({ endpoint, initialData, ... })`.

**Critérios de Aceite:**
- [ ] Hook criado com tipagem genérica
- [ ] 4 forms refatorados para usar o hook
- [ ] Comportamento de autosave idêntico
- [ ] Build sem erros

---

### T006 - Extrair hook useKnowledgeList (fetch/CRUD pattern)
**Status:** COMPLETED
**Tipo:** SEQUENTIAL
**Dependências:** T002
**Arquivos:**
- criar: `src/hooks/useKnowledgeList.ts`
- modificar: `src/components/knowledge/PainList.tsx`
- modificar: `src/components/knowledge/CaseList.tsx`
- modificar: `src/components/knowledge/ObjectionList.tsx`
- modificar: `src/components/knowledge/PatternList.tsx`

**Descrição:**
Os 4 List components compartilham estrutura de estado e fetch idêntica:
- Estado: `items, pagination, page, filter, isLoading, error, deleteTarget, isDeleting, formOpen, editTarget`
- Funções: `fetchItems`, `handleDelete` com optimistic update

Extrair para `useKnowledgeList<T>({ endpoint, pageSize })` com retorno tipado.

**Critérios de Aceite:**
- [ ] Hook criado com tipagem genérica
- [ ] 4 listas refatoradas para usar o hook
- [ ] Paginação e filtros funcionando igual
- [ ] Build sem erros

---

### T007 - Consolidar service layer (src/services → src/lib/services)
**Status:** COMPLETED
**Tipo:** SEQUENTIAL
**Dependências:** T003
**Arquivos:**
- mover: `src/services/analytics.service.ts` → `src/lib/services/`
- mover: `src/services/image.service.ts` → `src/lib/services/`
- mover: `src/services/niche-opportunity.service.ts` → `src/lib/services/`
- mover: `src/services/theme-generation.service.ts` → `src/lib/services/`
- mover: `src/services/theme-scoring.service.ts` → `src/lib/services/`
- deletar: `src/services/` (pasta, após movimentação)
- modificar: todos os importadores

**Descrição:**
Dois diretórios de services causam confusão:
- `src/services/` — 5 serviços de domínio (após remoção do stub post.service em T003)
- `src/lib/services/` — 28 serviços implementados

Consolidar todos em `src/lib/services/` para ter fonte única da verdade.
Verificar imports antes de mover.

**Critérios de Aceite:**
- [ ] 5 serviços movidos para `src/lib/services/`
- [ ] Pasta `src/services/` removida
- [ ] Todos os importadores atualizados
- [ ] Build sem erros

</task-list>

<validation-strategy>
- `npm run build` após cada task para verificar erros de TypeScript
- Verificar que nenhum import foi quebrado
- Verificar que comportamentos de autosave e lista permanecem idênticos
</validation-strategy>

<acceptance-criteria>
- [ ] T001: SECTOR_OPTIONS centralizado
- [ ] T002: PaginationData centralizado
- [ ] T003: post.service stub removido
- [ ] T004: hooks renomeados para camelCase
- [ ] T005: useKnowledgeForm extraído
- [ ] T006: useKnowledgeList extraído
- [ ] T007: service layer consolidado
- [ ] Build passando sem erros
</acceptance-criteria>
