# Auditoria E2E de Production-Readiness — 2026-06-10

Objetivo: deixar o inbound-forge funcionando ponta a ponta em producao. Auditoria
multi-agente (8 dimensoes) sobre o estado REAL do codigo (nao docs, que estavam stale),
cada achado verificado empiricamente antes de corrigir.

## Gates de baseline (verdes)

| Gate | Resultado |
|------|-----------|
| `next build` (producao) | PASS — 375 paginas |
| `tsc --noEmit` (app) | 0 |
| `next lint` | 0 erros/0 warnings |
| Workers tsc (4/4) | deployaveis |
| Tests (root + workers) | 573 + 111 |
| `prisma validate` | valido (57+2 migrations) |

Backlog stale de QA (2026-04-05) verificado e **ja resolvido** no codigo atual:
404/500 handlers existem; 4 locales em paridade; XSS sanitizado (DOMPurify + GA4 id
regex); error codes IMAGE_051/POST_051/ANALYTICS_050 presentes; score decay presente.

## Achados confirmados e corrigidos

| # | Sev | Achado | Fix | Commit |
|---|-----|--------|-----|--------|
| 1 | BLOCKER | `middleware.ts` fail-closed 401-ava TODOS os 7 crons da Vercel (GET sem cookie) e as chamadas worker->app (Bearer WORKER_AUTH_TOKEN) ANTES do auth proprio rodar -> nenhum cron executava + Instagram-publish-via-worker morto | early-skip `/api/cron/*` + isenta rotas worker-token (instagram/publish, health/heartbeat, workers/*) do gate de sessao quando ha Bearer; handler segue sendo o gate real | `28ebe8b` |
| 3 | BLOCKER | `prisma migrate deploy` em DB limpo FALHAVA na 005 (backfill `UPDATE leads ... WHERE funnel_stage`); 5 colunas + 3 indices de leads + 2 valores do enum Channel no schema sem migration (drift) | migration corretiva idempotente `...004b` (antes da 005) + migration do enum; verificado em postgres local (deploy passa da 005, leads ganha as colunas, enum com 5 valores) | `b04d81a` |
| 4 | BLOCKER | `workers/image-worker` Dockerfile `npm ci` falhava (lock sem o devDep `prisma`) -> docker build abortava | regen do `package-lock.json` (`--package-lock-only`) | `8c2e027` |
| 5 | HIGH | `blog-scheduler` cron (unico caminho SCHEDULED->PUBLISHED de BlogArticle) ausente do `vercel.json` -> artigos agendados nunca publicavam | registrado no `vercel.json` + `CRON_JOBS` (a cada 5 min) | `8c8471a` |
| 6 | HIGH | `CSRF_SECRET` (csrf.ts LANCA se ausente/<32; usado no middleware em toda mutacao) ausente do `.env.production.example` e do EnvSchema | adicionado ao EnvSchema (fail-fast no startup) + documentado CSRF_SECRET e CRON_SECRET no production example | `d2ccbba` |
| 7 | HIGH (UX) | ~40 chaves `settings.*`/`header.*` referenciadas pelo codigo nao existiam em NENHUM dos 4 locales -> chave crua renderizada como label | adicionados os namespaces settings.profile/api/preferences/schedule/nav + header labels nos 4 locales (573 chaves/locale, paridade) | `201b22b` |
| 8 | MED | next-intl sem `onError`/`getMessageFallback` -> MISSING_MESSAGE silencioso (foi por isso que o #7 passou no build) | hooks adicionados: dev/test logam+marcam ⚠️; prod mantem comportamento (sem lancar) | `ea887c5` |

Polish de build/observabilidade (do `next build`): `metadataBase` + `outputFileTracingRoot`
(`6019318`), hook Sentry `onRouterTransitionStart` (`e42ac24`).

## Falso-positivo refutado

- **"Edge middleware chama node:crypto (createHmac) -> throw em toda escrita"**: a auditoria
  marcou como BLOCKER inferindo de um warning de build. Verificado: o `next build` NAO emite
  warning de node:crypto/edge e `createHmac` nao aparece flagueado -> Next 15 suporta
  createHmac no edge middleware desta versao. NAO mexido (o refactor de CSRF para Web Crypto
  teria risco sem ganho). Disciplina: achados de auditoria sao verificados antes de aplicar.

## Remanescente (lower-impact / nao-verificavel aqui)
- `src/tests/integration/**` no CI (risco MSW); image/video como root no container; BullMQ
  sobre TCP da URL REST do Upstash (precisa creds vivas); qualidade do worker-panel "Rodar agora".
  Ver `ONDA2-REVIEW-2026-06-10.md` secao 5.1.
