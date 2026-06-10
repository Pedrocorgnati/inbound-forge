# Onda 2 P1 — implantação + revisão adversarial (2026-06-10)

Continuação da revisão total `TOTAL-REVIEW-2026-06-09.md`. Esta onda implantou os
11 clusters P1 restantes (SA-SEC-02 fechou na sessão anterior) e rodou uma revisão
adversarial de 14 agentes (verify dos próprios fixes + sweep de completude).

## 1. Implantado e verificado (Onda 2 P1)

Gate de verificação final: `tsc --noEmit` = 0; root vitest **573/573**; suites de
workers **106/106** (image 53, video 8, publishing 7, scraping 38).

| Commit | Cluster | Resumo |
|--------|---------|--------|
| `e3272b2` | WK-WRK-03 | Reaper de jobs presos em PROCESSING (image/video Redis + publishing DB-poll) |
| `72af872` | WK-WRK-04/05 | Retries persistentes (Redis ZSET) + graceful drain no SIGTERM |
| `95c3ff5` | (test repair) | Destrava suite image-worker (estava vermelha no HEAD) |
| `6a68b7c` | WK-WRK-06 | rescraping cron enfileira batch real source-based |
| `dac0ac9` | SA-SEC-07 | key-manager cifra fail-loud (sem fallback base64 plaintext) |
| `91ffed7` | IB-I18N-01 | privacy/cookies em 4 locales + fix hreflang |
| `ed44036` | FE-01 | tab-bar de sub-navegação de analytics |
| `a5940c7` | FE-02 | nav approvals/themes/niche/assets + hub /compliance + i18n |
| `3a78f07` | WK-WRK-07 | remove railway.toml agregado morto + cron de tokens na Vercel |
| `84436fa` | TQ-TST-07/08 | suites vitest publishing/video workers + adapters app |
| `9d6d5b6` | TQ-TST-06 | CI roda integration + worker tests; e2e/perf dedicado |
| `8876928` | (review fix) | SIGINT graceful drain (regressão) + reaper rpush-first |

## 2. Falso-positivo descartado na revisão

- **scraping-worker "não compila" (alegado BLOCKER).** A revisão rodou `tsc` no
  scraping-worker contra um `@prisma/client` LOCAL stale/untyped (`prisma.source`
  inferia `any` → `filterUnprotected(any)` colapsava `T` para `ProtectableSource`
  → 13 erros). **Verificado empiricamente:** replicando o build Docker (copiar
  `prisma/` da raiz + `npx prisma generate` no dir do worker) → `tsc --noEmit` = 0.
  O Dockerfile gera o client fresco no build, então `npm run build` NÃO quebra por
  esse motivo. O finding era artefato local. (Os tests do worker já passavam via
  esbuild, que não typecheca — por isso o stale passou despercebido.)

## 3. Backlog Onda 3 — pré-existente, fora do escopo Onda 2 (verificado-real)

> Nenhum destes foi introduzido nesta sessão; vários foram deliberadamente
> escopados para fora pela investigação Onda 2 (ex.: CX-06). Precisam de decisão
> de design ou verificação (docker/schema) que esta sessão não pôde fechar.

### 3.1 [BLOCKER] CX-06 — pipeline de scraping app→worker não conecta
- **O quê:** app faz `redis.lpush(scraping:<batchId>)` (lista plana, Upstash REST)
  em `src/app/api/workers/scraping/trigger/route.ts:70` e
  `src/workers/rescraping.worker.ts:49`. O consumer é um BullMQ `Worker('scraping')`
  (`workers/scraping-worker/src/worker.ts:186`) que lê só de `bull:scraping:*`,
  alimentado EXCLUSIVAMENTE pelo node-cron interno do worker (`cron.ts` → `queue.add`).
- **Impacto:** o cron interno diário do worker FUNCIONA (scraping acontece), mas o
  trigger manual e o cron de rescraping do app são no-ops (escrevem em lista que
  ninguém lê). O WK-WRK-06 desta onda corrigiu o no-op-que-só-logava, mas espelhou
  o producer canônico que já era desconectado — logo continua sem chegar ao consumer.
- **Decisão necessária (3 opções):**
  - (a) worker drena `scraping:<batchId>` via `lpop`/`lrange` e alimenta `processBatch`
    (contido ao worker; padrão igual image/video que usam lpop polling);
  - (b) app produz no BullMQ (exige dep `bullmq` no app + conexão TCP, não REST);
  - (c) app dispara via endpoint HTTP do worker (hoje o worker só responde `/health`).
  - Recomendado: (a) — menor blast radius, consistente com image/video.

### 3.2 [HIGH] scraping-worker Dockerfile inconsistente com os outros 3
- **O quê:** `workers/scraping-worker/Dockerfile` usa COPY worker-relativos
  (`COPY package.json`, `COPY src/ ./src/`, `COPY prisma/ ./prisma/`) — assume
  build-context = dir do worker. Os outros 3 (image/video/publishing) usam
  build-context = RAIZ (`COPY workers/<w>/...` + `COPY prisma ./prisma`). O
  `railway.toml` tem `dockerfilePath=workers/scraping-worker/Dockerfile` sem
  `rootDirectory` → context = raiz → os COPY worker-relativos pegam os arquivos
  errados (package.json/src do Next.js) e `COPY prisma/ ./prisma/` não existe no
  dir do worker.
- **Fix:** reescrever o Dockerfile do scraping-worker no padrão dos outros 3
  (context = raiz, COPY `workers/scraping-worker/...` + `COPY prisma ./prisma`),
  preservando os specifics do scraping (Playwright/chromium, user `scraper`,
  `--ignore-scripts`). Requer `docker build` para validar (não disponível aqui).

### 3.3 [HIGH] publishing BLOG adapter → rota inexistente
- **O quê:** `workers/publishing-worker/src/publisher.ts:33` faz POST em
  `/api/v1/blog/articles/${postId}/publish` — essa rota NÃO existe (só
  `articles/[id]/schedule`). A rota real é `/api/v1/blog/[idOrSlug]/publish`, que
  faz `blogArticle.findUnique({ where: { id: idOrSlug } })`. Além do path, o worker
  passa um **Post.id**, e a rota espera um **BlogArticle.id** — precisa esclarecer
  a relação Post↔BlogArticle antes de corrigir.
- **Impacto:** todo post BLOG agendado recebe 404 → handleFailure → 3 tentativas →
  FAILED. Auto-publish de BLOG via fila é impossível hoje. Pré-existente (6b65dc3 / 491e6fa).

### 3.4 [MEDIUM] outros (pré-existentes)
- **CI não cobre `src/tests/integration/**`** (9 arquivos, inclui RLS cross-tenant
  e PII crypto roundtrip): o job `integration` só inclui `tests/integration/**`.
  Incluir `src/tests/integration/**` no `vitest.integration.config.ts` exige validar
  setup (alias `@`, possível MSW) antes — senão o CI fica vermelho. (Item 6 do
  spec TQ-TST-06, marcado follow-up.)
- **image/video workers rodam como root no container** (sem `USER`), divergindo de
  scraping/publishing (que usam user não-root). Hardening.
- **Secret de auth de worker em dois nomes** (`WORKER_AUTH_TOKEN` vs `WORKER_AUTH_SECRET`).
  Unificar.
- **Worker panel "Rodar agora" (scraping)** acerta uma rota estática que faz shadow
  da rota dinâmica com contrato diferente (toast enganoso + payload/reason perdidos
  + sem audit log).
- **scraping-worker usa BullMQ sobre URL Upstash REST** — conexão TCP construída da
  URL errada (relacionado a 3.1; resolver junto).

## 4. Itens da revisão já resolvidos nesta sessão
- WK-WRK-04 SIGINT (regressão): consumer image/video agora trata SIGTERM+SIGINT (`8876928`).
- WK-WRK-03 reaper: rpush-first para não orfanar job em PENDING (`8876928`).
