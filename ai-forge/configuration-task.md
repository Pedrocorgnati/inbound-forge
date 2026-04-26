# Configuration Task List — Inbound Forge
Gerado por: `/nextjs:configuration`
Atualizado em: 2026-04-06

---

## Tasks Anteriores (todas CONCLUÍDAS)

| ID | Descrição | Status |
|---|---|---|
| T001 | `validateEnv()` chamada no startup via `instrumentation.ts` | ✅ DONE |
| T002 | Schema Zod expandido com 20+ variáveis | ✅ DONE |
| T003 | `NEXTAUTH_*` removidas do `.env.example` | ✅ DONE |
| T004 | `.env.test` adicionado ao `.gitignore` | ✅ DONE |
| T005 | `engines` + `packageManager` declarados no `package.json` | ✅ DONE |
| T006 | `.nvmrc` (20.18.0) + `.npmrc` (engine-strict) criados | ✅ DONE |
| T007 | Scripts `validate`, `postinstall`, `prebuild` presentes | ✅ DONE |
| T008 | `NEXT_PUBLIC_APP_URL` adicionada ao schema Zod | ✅ DONE |
| T009 | `remotePatterns` usa `SUPABASE_HOSTNAME` env var | ✅ DONE |

---

## Novos Gaps — Rodada 2026-04-06

### T010 – [FIXED] NEXT_PUBLIC_GA4_ID vs NEXT_PUBLIC_GA4_MEASUREMENT_ID — GA4 quebrado
**Tipo:** SEQUENTIAL
**Dependências:** none
**Status:** ✅ FIXED

**Arquivos modificados:**
- `src/components/analytics/GA4Script.tsx`

**Descrição:**
`GA4Script.tsx` lia `process.env.NEXT_PUBLIC_GA4_ID`, mas o `.env.example` e o schema Zod
usavam `NEXT_PUBLIC_GA4_MEASUREMENT_ID`. O mismatch fazia `GA4_ID` ser sempre `undefined`,
desabilitando silenciosamente o tracking mesmo com consentimento.

**Fix aplicado:**
```diff
- const GA4_ID = process.env.NEXT_PUBLIC_GA4_ID
+ const GA4_ID = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID
```

---

### T011 – [FIXED] WORKER_BASE_URL ausente do .env.example e env.ts
**Tipo:** PARALLEL-GROUP-1
**Dependências:** none
**Status:** ✅ FIXED

**Arquivos modificados:**
- `.env.example` — variável adicionada com comentário
- `src/lib/utils/env.ts` — campo `WORKER_BASE_URL` com default `http://localhost:3001`

**Descrição:**
`src/lib/worker-client.ts` usa `process.env.WORKER_BASE_URL ?? 'http://localhost:3001'` mas a variável
não estava documentada no `.env.example` nem no schema Zod. Em produção, sem a variável configurada,
o worker apontaria para `localhost:3001` silenciosamente.

---

### T012 – [FIXED] SUPABASE_HOSTNAME ausente do .env.example
**Tipo:** PARALLEL-GROUP-1
**Dependências:** none
**Status:** ✅ FIXED

**Arquivos modificados:**
- `.env.example` — `SUPABASE_HOSTNAME` adicionada com comentário explicativo

**Descrição:**
`next.config.mjs` usa `process.env.SUPABASE_HOSTNAME ?? '*.supabase.co'` para `remotePatterns`, mas a variável
não estava documentada no `.env.example`. Sem ela configurada em produção, imagens Supabase são
servidas via wildcard `*.supabase.co`, mais permissivo que o necessário.

> Nota: `SUPABASE_HOSTNAME` é build-time (lida pelo `next.config.mjs`), não runtime, portanto não foi
> adicionada ao schema Zod em `instrumentation.ts`.

---

### T013 – [FIXED] NEXT_PUBLIC_BLOG_BASE_URL duplicada no .env.example
**Tipo:** PARALLEL-GROUP-1
**Dependências:** none
**Status:** ✅ FIXED

**Arquivos modificados:**
- `.env.example` — entrada duplicada removida (linha 76)

**Descrição:**
`NEXT_PUBLIC_BLOG_BASE_URL` aparecia duas vezes no `.env.example` (linha 17 na seção "App URLs"
e linha 76 na seção "Blog"), com valores idênticos. A segunda entrada foi removida.

---

### T014 – [FIXED] NEXTAUTH_SECRET stale no checklist de .env.production.example
**Tipo:** PARALLEL-GROUP-1
**Dependências:** none
**Status:** ✅ FIXED

**Arquivos modificados:**
- `.env.production.example` — linha `# [ ] NEXTAUTH_SECRET` removida do checklist pré-deploy

**Descrição:**
O checklist pré-deploy no `.env.production.example` listava `NEXTAUTH_SECRET` apesar do header do arquivo
indicar explicitamente "o projeto usa Supabase Auth — NEXTAUTH_* NAO e necessario". Confusão para futuros devs.

---

## Checklist Final

- [x] `.env.example` documentado e com todos os campos obrigatórios
- [x] `NEXT_PUBLIC_*` só para variáveis públicas; secrets em variáveis privadas
- [x] Validação centralizada em `src/lib/utils/env.ts` (Zod)
- [x] `next.config.*` configurado (images, output, headers, experimental, remotePatterns)
- [x] `productionBrowserSourceMaps` protegido via Sentry `hideSourceMaps: true`
- [x] `poweredByHeader: false`
- [x] Scripts `lint`, `type-check`, `test`, `validate`, `build`, `start`, `postinstall` presentes
- [x] `engines` e `packageManager` declarados
- [x] `.nvmrc` e `.npmrc` com `engine-strict=true`
- [x] Feature flags e URLs centralizadas via ENV (PostHog)
- [x] `SUPABASE_HOSTNAME` documentada para restringir `remotePatterns` em produção
- [x] `WORKER_BASE_URL` documentada e validada no schema Zod
- [x] GA4 env var name consistente (`NEXT_PUBLIC_GA4_MEASUREMENT_ID`)
- [x] `.gitignore` cobre `.env`, `.env.local`, `.env.*.local`, `.env.test`, `.env.docker`
