# Boundaries Task — Server/Client Separation Audit
> Gerado por `/nextjs:boundaries` em 2026-04-05
> workspace: output/workspace/inbound-forge

---

### T001 – Adicionar `server-only` em prisma.ts
**Tipo:** SEQUENTIAL
**Dependências:** none
**Status:** COMPLETED

**Arquivos:**
- modificar: `src/lib/prisma.ts`

**Descrição:** `PrismaClient` expõe conexão direta com o banco de dados. Sem `'server-only'`, qualquer importação acidental em um Client Component o incluiria no bundle do cliente — expondo credenciais de `DATABASE_URL`.

**Critérios de aceite:**
- `import 'server-only'` na linha 1 de `src/lib/prisma.ts`
- Build não regride

---

### T002 – Adicionar `server-only` em image-pipeline.ts
**Tipo:** SEQUENTIAL
**Dependências:** none
**Status:** COMPLETED

**Arquivos:**
- modificar: `src/lib/image-pipeline.ts`

**Descrição:** O módulo importa `fs`, `path`, `satori`, `@resvg/resvg-js` e `sharp` — todos Node.js-only. Se importado em Client Component, causa crash de runtime no browser.

**Critérios de aceite:**
- `import 'server-only'` na linha 1 de `src/lib/image-pipeline.ts`
- Build não regride

---

### T003 – Remover `'use client'` de CharCounter.tsx
**Tipo:** PARALLEL
**Dependências:** none
**Status:** COMPLETED

**Arquivos:**
- modificar: `src/components/content/CharCounter.tsx`

**Descrição:** Componente puramente apresentacional — recebe `current` e `limit` como props, sem hooks, handlers ou browser APIs. Desnecessariamente marcado como Client Component, o que aumenta o bundle.

**Critérios de aceite:**
- Diretiva `'use client'` removida
- Componente funciona como Server Component (sem hooks ou efeitos)
- Build sem erros

---

### T004 – Remover `'use client'` de ChannelPreview.tsx
**Tipo:** PARALLEL
**Dependências:** none
**Status:** COMPLETED

**Arquivos:**
- modificar: `src/components/content/ChannelPreview.tsx`

**Descrição:** Componente puramente apresentacional — renderiza preview de canal (LinkedIn/Instagram/Blog) com base em props serializáveis (string, string[], Channel enum). Sem hooks, handlers ou browser APIs. A importação de `Channel` do Prisma é type-only (erasada em runtime).

**Critérios de aceite:**
- Diretiva `'use client'` removida
- Import de `Channel` do Prisma permanece (type import, sem custo de bundle)
- Build sem erros

---

## Itens fora do escopo deste comando

| Item | Recomendação |
|------|-------------|
| 30+ `useEffect + fetch` patterns (dados iniciais via client) | `/nextjs:server-actions` — migrar para Server Actions |
| `'client-only'` para hooks/utils browser-only | `/nextjs:configuration` — adicionar pacote e guards |
| Hidration warning em `LangUpdater.tsx` | `/nextjs:data-fetching` — verificar SSR vs client |

---

## Resumo Quantitativo

| Categoria | Antes | Depois |
|-----------|-------|--------|
| `server-only` imports | 0 | 2 |
| `'use client'` desnecessários | 2 | 0 |
| Dynamic imports (ssr:false) | 4 ✓ | 4 ✓ |
| `useId` usages | 4 ✓ | 4 ✓ |
| `suppressHydrationWarning` | 1 ✓ | 1 ✓ |
| Context providers centralizados | 5 ✓ | 5 ✓ |
