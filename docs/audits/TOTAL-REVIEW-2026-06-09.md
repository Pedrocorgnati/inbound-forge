# Inbound Forge - Relatorio Total de Revisao

**Data:** 2026-06-09
**Escopo:** Revisao total do workspace `inbound-forge` (Next.js 15.5.14 / App Router multi-locale + 4 workers Railway + Postgres/Prisma + Supabase Auth), cobrindo 12 dimensoes de engenharia, seguranca, compliance e operacao.
**Metodo:** 12 revisores especializados (build, seguranca, API, frontend/ECU, banco, workers, LGPD, observabilidade, i18n, testes, deps/infra, docs) seguidos de uma camada de **verificacao adversarial** que reexecutou evidencias, confirmou, ajustou severidade ou descartou cada finding-chave. Aplicada a regra: apenas findings `confirmed` ou `severity_adjusted` entram no corpo (na severidade ajustada); `false_positive` vai para o Apendice A; findings sem verificacao (P2/P3) entram como reportados.

**Contagem final:** 146 findings acionaveis processados (3 P0 / 30 P1 / 89 P2 / 24 P3) + 1 falso-positivo descartado.

---

## Notas de correcao pos-sintese (revisao manual contra o disco)

Apos a sintese, tres pontos foram reconferidos diretamente contra o working tree ao vivo. Eles corrigem/atualizam o corpo do relatorio:

1. **Residuo "Pedro Murta" -> RESOLVIDO (nao apenas "provavelmente stale").** `grep -rniI murta` no repo inteiro (excl. node_modules/.next) retorna **0 ocorrencias**; `DEFAULT_AUTHOR`, `schema-ld.ts`, `blog-article.ts`, `blog-admin.service.ts` e os seeds/docs agora dizem **Pedro Corgnati**, e batem com o HEAD (`git diff HEAD` desses arquivos = vazio). No inicio desta revisao (~11:15) o working tree ainda tinha "Murta" (44 hits); um processo externo (working tree compartilhado com outras pipelines) reverteu os 23 arquivos para o HEAD num unico `git restore`/`checkout` as 11:57:53, durante a revisao. **Acao:** dar por encerrados DB-05, IB-BRAND-02/03/04/05, DD-DOC-05 e a parte "Murta" de DD-DOC-04 (a parte "Next 14 / 25 entidades" do README continua valida). O item IB-BRAND-01 ja constava como falso-positivo no Apendice A; agora o tema inteiro esta fechado.

2. **`next build` -> CONFIRMADO que completa (corrige BH-BUILD-01 / DC-BUILD-01, antes "nao confirmado, EXIT:124").** Build de producao real ate o fim: **`✓ Compiled successfully in 23.4min`** + **`✓ Generating static pages (370/370)`**. Os EXIT:124 anteriores eram timeout do harness (420s/900s), nao hang. Ou seja: **o build NAO esta quebrado** — porem o compile webpack leva ~23 min e o total (compile + 370 paginas estaticas + upload de source map Sentry) passa de 25-30 min na maquina de referencia (i7-6700). Isso e risco real de DX e de timeout de CI/Vercel. Limpar `SENTRY_AUTH_TOKEN` nao acelerou -> o gargalo e o compile webpack (Sentry webpack plugin instrumentando todos os modulos + bundle-analyzer wrapper + ausencia de Turbopack no build). Reclassificar como **P1 de performance de build** (nao P0/hang). Correcao sugerida: avaliar `next build --turbopack`, reduzir escopo do Sentry webpack plugin, e confirmar headroom de timeout no Vercel.

3. **Esta revisao foi read-only.** Os 26 subagents NAO usaram Edit/Write e NAO executaram `git restore/checkout/stash/reset` (verificado nos transcripts) — nenhuma mudanca no codigo veio desta revisao. A mudanca Mur->Corgnati as 11:57:53 e de processo externo. O unico arquivo escrito por esta revisao e este proprio relatorio.

4. **Decisoes do operador (entrevista 2026-06-09) + status de remediacao.** Quatro decisoes calibraram o plano de ataque (registro em `blacksmith/inbound-forge-remediacao-decisoes.md`):
   - **NAO esta em producao (so local/dev).** Sem trafego nem banco de prod com as migrations aplicadas -> **DD-GIT-01 rebaixado de potencial-P0 para P1** (o condicional "escala para P0 se ja aplicadas" nao se concretiza). Os 3 P0 sao "antes do 1o deploy", nao sangramento ativo.
   - **Single-tenant DEFINITIVO** (UserRole so OPERATOR, single-user-guard por design). Isto **fecha como NAO-ISSUES**: **CP-COMP-11** (Lead sem `operatorId` — nao ha cross-tenant a isolar), as rotas **`/api/admin/*` com apenas `requireSession`** (nao ha outro tenant para escalar privilegio) e a **contradicao DB-08 x Pontos Fortes** (o "isolamento multi-tenant do scraping-audit" e defense-in-depth, nao requisito; o bypass do RLS pelo role dono do Prisma e esperado em single-tenant). Debito registrado: se um dia virar multi-operador, esses gaps voltam e exigem migracao retroativa de dados.
   - **Execucao autonoma end-to-end.**
   - **Status (Onda 0 + Onda 1, commitado em main):** Onda 0 higiene -> `9a76029` (schema + 8 migrations versionados) + `e35eb76` (este relatorio). Onda 1 -> `63ad7d6` (CI verde: 533/533, 3 mocks stale corrigidos — eram test-side, nao defeitos), `e43b024` (**P0 AP-API-01 CORRIGIDO**: Idempotency-Key no apiClient + funil publico + reveal/approve), `f2d37d6` (**P0 WK-WRK-01 CORRIGIDO**: image/video workers geram @prisma/client; video-worker ganhou Dockerfile/railway.toml), `491e6fa` (**P0 WK-WRK-02 CORRIGIDO**: publishing-worker consolidado no real, stub removido — resolve tambem **DC-WORK-01**; corrigidos 3 mismatches do publisher.ts contra o schema). `docker build` dos workers nao executado neste ambiente (sem docker); build context documentado nos Dockerfiles.

---

## Sumario Executivo

**Estado geral:** O inbound-forge tem fundacoes de engenharia maduras (criptografia PII AES-256-GCM, CSRF HMAC, MFA com backup codes one-time, middleware de seguranca fail-closed, component-kit a11y, suite de health checks, runbooks) mas **NAO esta pronto para producao**. O produto tem 3 bloqueadores P0 sobre o caminho de receita primario e a camada assincrona, a suite de testes esta vermelha (gate de deploy quebrado), e ha vulnerabilidades de dependencia alcancaveis com fix disponivel.

**Prontidao para producao: 50/100.** A media aritmetica das 12 dimensoes e ~56, mas a nota global e rebaixada porque os 3 P0 sentam no funil publico de captacao de lead (entrada principal do produto) e na camada de workers (publishing reporta sucesso sem publicar; image/video worker nao conseguem rodar). Enquanto os P0 nao fecham, a prontidao efetiva fica ancorada nas piores dimensoes (workers 40, testes 45, API 48). Apos os P0+P1, a base sobe para a faixa de ~75-80.

**Os 5 maiores riscos:**

1. **Funil publico de lead 100% quebrado (AP-API-01, P0).** `withIdempotency` obrigatorio retorna 400 ERR-060 em TODA submissao de `/api/v1/diagnostico` porque o front nao envia `Idempotency-Key`. Zero leads capturados + reveal de PII e approve de Instagram/blog tambem quebrados.
2. **Camada de workers nao-viavel em producao (WK-WRK-01 + WK-WRK-02, P0).** image/video-worker buildam sem `prisma generate` (quebram na 1a query); e o `railway.toml` raiz deploya um STUB de publishing que marca posts como PUBLISHED **sem publicar** (viola integridade de dados e Zero Silencio).
3. **Gate de CI/build quebrado e raso (TQ-TST-01 suite vermelha bloqueia deploy; TQ-TST-06 CI so roda unit, pula integration/e2e/workers/mutation; threshold de cobertura decorativo).** Sem rede de seguranca para os fixes acima.
4. **Vulnerabilidades de dependencia alcancaveis (BH-SEC-01 / SA-SEC-04 / DC-DEP-01, P1): 1 critical + 6 high, incluindo Next.js middleware-bypass/SSRF e axios SSRF, todas com fix.** O `npm audit` nao e gate de PR, entao ja entraram em main.
5. **Compliance LGPD com fluxos mortos (CP-COMP-01: retencao de 24 meses nunca roda; CP-COMP-03: portabilidade async dead-ends) + schema/migrations nao commitados (DD-GIT-01) com risco de drift prod-vs-repo.**

---

## Scorecard por Dimensao

| Dimensao | Readiness | #P0 | #P1 | #P2 | Veredito (1 linha) |
|---|---|---|---|---|---|
| Build / Typecheck / Lint / Testes / Vulns | 63 | 0 | 4 | 7 | typecheck/lint verdes, mas suite RED e Next.js HIGH alcancavel; `next build` completa porem lento (~23min compile, ver Nota 2) |
| Seguranca e Autorizacao | 62 | 0 | 3 | 6 | primitivas solidas; crons fail-open + SSRF scraping + CVEs sao reais |
| Superficie de API (295 rotas) | 48 | 1 | 0 | 7 | P0 sistemico de idempotencia quebra funil publico; envelope de erro inconsistente |
| Frontend / UX / ECU | 68 | 0 | 2 | 3 | maduro, mas paginas inteiras orfas (Zero Orfaos violado) |
| Banco de Dados / Prisma | 58 | 0 | 1 | 5 | schema bem modelado; retencao PII real nao aplicada; drift schema<->DB |
| Workers e Confiabilidade | 40 | 2 | 5 | 9 | 2 P0 de deploy/build + sem reaper, retry in-process volatil, rescraping no-op |
| Compliance / LGPD / PII | 58 | 0 | 2 | 7 | bases boas; retencao 24m e portabilidade async quebradas |
| Observabilidade e Operacao | 60 | 0 | 3 | 9 | onRequestError ausente, crons POST-only mortos, erros engolidos sem Sentry |
| i18n e Conteudo/Branding | 62 | 0 | 1 | 7 | paridade de chaves perfeita; paginas legais PT servidas a todos os locales |
| Qualidade de Testes | 45 | 0 | 5 | 9 | suite RED quebra gate; CI so roda unit; publishing/video/auth sem teste |
| Dependencias / Config / Infra | 55 | 0 | 3 | 13 | CI de PR solido, mas deploy de workers fragmentado e deps vulneraveis |
| Docs / Decisoes / Drift / Git | 55 | 0 | 1 | 7 | 355 changes uncommitted; openapi 18%; decisoes vencidas |
| **TOTAL** | **~50 global** | **3** | **30** | **89** | **Nao pronto; corrigir P0 + onda P1 antes de lancar** |

---

## P0 - Bloqueadores (corrigir antes de qualquer deploy)

### 1. AP-API-01 (api-surface) - `withIdempotency` obrigatorio quebra o funil PUBLICO de lead + reveal PII + approve
- **Local:** `src/lib/idempotency/middleware.ts:86-90`; `src/app/api/v1/diagnostico/route.ts:48-52` + caller `src/app/[locale]/diagnostico/_components/DiagnosticoForm.tsx:89`; tambem `RevealPIIModal.tsx:63`, `InstagramPublisherPanel.tsx:151`, `blog-manage/[slug]/review/page.tsx:51`.
- **Impacto:** O middleware retorna 400 ERR-060 INCONDICIONALMENTE quando falta o header `Idempotency-Key`. O form publico (pagina ao vivo, entrada principal do produto inbound) faz POST sem o header -> **toda submissao retorna 400 e o lead some** (o envelope de erro nao tem campo `message`, entao a UI mostra "Nao foi possivel enviar" generico). Reveal de PII (LGPD), approve+publish de Instagram e approve de blog tambem quebrados. Nao existe injecao global do header (apiClient so injeta CSRF). Verificado por execucao real.
- **Correcao:** Injetar `Idempotency-Key` (helper `uuidv7.ts` ja existe) no `apiClient` para metodos mutativos (como ja faz com CSRF) e rotear esses fetch via apiClient; para o form publico, gerar a chave no cliente. Alternativa: tornar a key OPCIONAL no `withIdempotency` (gerar UUID v7 server-side quando ausente). Adicionar testes de rota para o caminho sem-chave.
- **Effort:** M

### 2. WK-WRK-01 (workers) - image-worker e video-worker buildam sem `prisma generate`
- **Local:** `workers/image-worker/Dockerfile` (sem `COPY prisma/` nem `npx prisma generate`); `workers/image-worker/package.json:13` (sem CLI `prisma`); query em `consumer.ts:93` (`db.imageJob.findUnique`). video-worker repete o gap e nao tem Dockerfile/railway.toml.
- **Impacto:** `@prisma/client` permanece como stub nao-inicializado -> 1a query lanca "did not initialize yet. Please run prisma generate". O worker core de geracao de criativos **nao processa nenhum job em producao**. NAO e convencao: `workers/scraping-worker/Dockerfile:49` faz o generate corretamente. Verificado (inclusive: CMD do Dockerfile monolitico aponta para `dist/workers/index.js` inexistente).
- **Correcao:** Adicionar `prisma` (mesma major do app, v6) como devDependency, `COPY prisma/schema.prisma` e `RUN npx prisma generate` no stage builder de image-worker e video-worker. Criar Dockerfile + railway.toml para o video-worker. Smoke-test que instancia PrismaClient e roda uma query real.
- **Effort:** M

### 3. WK-WRK-02 (workers) - publishing-worker: o `railway.toml` raiz deploya o STUB que marca posts PUBLISHED sem publicar
- **Local:** `railway.toml` (service `publishing-worker` -> `apps/publishing-worker/Dockerfile`); stub `apps/publishing-worker/src/main.ts:37-51` (PROCESSING->DONE com publish comentado, sem heartbeat/retry); impl real `workers/publishing-worker/src/publisher.ts:66-95`.
- **Impacto:** O stub marca `PublishingQueue=DONE` com a publicacao real comentada (`// TODO: chamar channel adapter`) -> **posts reportados como publicados sem nada ter sido enviado** (viola Zero Silencio + integridade de dados). Sem WorkerHealth/heartbeat, sem retry/DLQ. Os dois workers consomem fontes diferentes (stub=rpop Redis; real=DB polling por scheduledAt), entao gate canal/locale ou a fila sao ignorados dependendo de qual roda. Verificado.
- **Correcao:** Eleger `workers/publishing-worker` como unico worker; apontar `railway.toml` raiz para ele; deletar/convertir `apps/publishing-worker`. Uma unica fonte de fila. NUNCA marcar DONE/PUBLISHED sem confirmacao do adapter. (Cruzar com DC-WORK-01/02, que sao a face de deploy desse mesmo problema.)
- **Effort:** M

> **Pre-requisito de seguranca para qualquer deploy:** commitar o schema/migrations uncommitted (DD-GIT-01, P1) antes de deployar, e rodar `prisma migrate status` contra prod para confirmar drift. Se as 8 migrations ja foram aplicadas em prod, DD-GIT-01 escala para P0.

---

## P1 - Antes do Lancamento

**Build / Testes RED (3 testes-side, bloqueiam green build):**
1. **BH-TEST-01** - 4 testes DELETE `/api/v1/jobs/[jobId]` recebem 400 em vez de 202/200/409/404 (`route.test.ts:113` nao envia header; `route.ts:96` envolve em `withIdempotency`). Fix: enviar `Idempotency-Key` UUID v7 + corrigir docstring stale em `route.ts:29`. **S**
2. **BH-TEST-02** - 2 testes de CSP nonce do middleware falham (`middleware.test.ts:9` mocka `@supabase/ssr` sem `auth.mfa.getAuthenticatorAssuranceLevel`; gate MFA fail-closed redireciona sem nonce). Fix: adicionar o mock de `mfa`. **S**
3. **BH-TEST-03** - 3 testes de angle-generation dao timeout 5s (`service.ts:101` chama `isServiceAvailable(CLAUDE)` -> `redis.get` real; teste nao mocka `@/lib/redis`/`service-health`). Fix: `vi.mock('@/lib/services/service-health')`. **S**

**Dependencias vulneraveis (mesmo nucleo em 3 dimensoes):**
4. **BH-SEC-01 / SA-SEC-04 / DC-DEP-01** - `next@15.5.14` direct com advisories HIGH alcancaveis (Middleware/Proxy bypass GHSA-26hh/492v/267c/36qx + SSRF via WebSocket); total **1 critical (protobufjs RCE) + 6 high (axios SSRF, fast-uri, glob) + 11 moderate (dompurify XSS, next-intl open-redirect)**, todas `fixAvailable`. App baseia auth/CSP em middleware e usa next/image. Fix: `npm i next@^15.5.x` mais recente (alvo >=15.5.18), `npm audit fix`, overrides para protobufjs/axios. **M**

**Seguranca:**
5. **SA-SEC-01** - 5 crons/workers fail-OPEN quando `CRON_SECRET` vazio (`publishing/process/route.ts:20`, `budget-check/rescraping/reconciliation/instagram-token-check`), inconsistente com 5 irmaos fail-closed; `CRON_SECRET` ausente do schema Zod de boot. Fix: padronizar `if (!expected || auth!==expected)` + validar no env.ts. **S**
6. **SA-SEC-02** - SSRF no pipeline de scraping: guard so no `/test` (regex sobre hostname textual, sem DNS resolve = rebinding; fetch sem `redirect:'manual'`); worker `crawler.ts:21` (`page.goto`) e `source.service.ts` (createSource) sem guard de IP. Fix: util unico `safeFetch` (resolve DNS, valida IP contra ranges privados, pina IP no dispatcher undici, `redirect:'manual'`). **M**

**Frontend / ECU (Zero Orfaos):**
7. **FE-01** - 4 paginas de Analytics (`channels/learning/themes/asov`) sao rotas orfas: `/analytics/page.tsx:45` so renderiza Dashboard+AsovTrendChart, nenhum link/tab para as sub-rotas (grep=0). Fix: tab-bar/cards-link em `/analytics`. **M**
8. **FE-02** - Multiplas paginas protegidas orfas (`/approvals`, `/compliance/*`, `/themes` index, `/niche-opportunities`, `/health/jobs`, `/assets`) sem entrada em `nav.ts`/BottomNav/CommandPalette. Fix: decidir por pagina (adicionar nav item ou remover rota). **M**

**Banco:**
9. **DB-04** - Colunas TTL de PII sem job de purga: `rawText` de `/diagnostico` (`DiagnosticoLead`) nunca eliminado (so `.create`, zero `.update/.delete` no repo). `runRetentionCleanup` nao tem caller. Viola LGPD art.16. Fix: estender cron lgpd-purge para nular/deletar `rawText` por `rawTextExpiresAt` + purgar scraping_audit/pii_reveal/webhook_event. **M**

**Workers:**
10. **WK-WRK-03** - Sem reaper de jobs presos em PROCESSING; `lpop` remove o job antes de processar (at-most-once) -> crash mid-job perde o job para sempre. Fix: reaper periodico que reabre PROCESSING antigo OU `BLMOVE`/visibility timeout. **M**
11. **WK-WRK-04** - Race de graceful shutdown: `index.ts:47` chama `db.$disconnect()` sem aguardar job em voo (SIGTERM no deploy Railway). Fix: drain Promise antes do disconnect. **S**
12. **WK-WRK-05** - Retry re-enqueue via `setTimeout` in-process (`retry.ts:65`): restart no backoff perde o job em PENDING. Fix: persistir `nextRetryAt` em sorted-set Redis + tick do consumer. **M**
13. **WK-WRK-06** - Cron semanal de rescraping e no-op orfao (`rescraping.worker.ts:32` chama `trackJob` com callback `console.info` que marca WorkerJob COMPLETED, nunca enfileira scraping real). Fix: chamar o producer `enqueueBatch` da fila scraping. **M**
14. **WK-WRK-07** - Config de deploy de workers incoerente: `workers/railway.toml` usa sintaxe `[services.x]` nao-padrao com env errados (`REDIS_URL` vs `UPSTASH_REDIS_REST_URL`, omite `UPSTASH_REDIS_REST_TOKEN`); video-worker sem deploy. Fix: um `railway.toml` por worker com nomes de env exatos. **M**

**Compliance:**
15. **CP-COMP-01** - Retencao de 24 meses de PII de lead NUNCA aplicada: `runRetentionCleanup` (unica funcao que anonimiza) sem caller/cron; o unico cron LGPD so apaga leads JA com `contactInfo:null`. Teste verde da falso conforto (cria leads sem contactInfo). Fix: cron `/api/cron/lgpd-retention` que invoque `runRetentionCleanup` + teste com lead PII real. **M** (`src/lib/lgpd/retention.ts:27`, `lgpd-purge.service.ts:54`, `vercel.json:13`)
16. **CP-COMP-03** - Fluxo async de portabilidade (Art.18 V) quebrado ponta-a-ponta: `processLgpdExport` (`lgpd-export.worker.ts:14`) sem nenhum caller; POST cria `pending` e a UI fica eternamente "Aguardando..." prometendo email que nunca chega (TODO `worker:62`). Fix: enfileirar o worker OU apontar a UI para o `/api/v1/me/export` sincrono que ja funciona; tratar estados failed/expired. **M**

**Observabilidade:**
17. **OB-OBS-01** - Hook Sentry `onRequestError` ausente (`src/instrumentation.ts` so exporta `register()`): erros de RSC/SSR/layouts nao chegam ao Sentry (build avisa). Fix: `export const onRequestError = Sentry.captureRequestError`. **S**
18. **OB-OBS-02** - Crons e webhooks engolem erro sem capturar no Sentry: 8/9 crons usam `console.error`/`logger.error` (que NAO forwarda para Sentry); webhooks calcom/tiktok idem. Fix: `captureException` nos catch + wrapper `withCronErrorCapture`. **M**
19. **OB-OBS-03** - 3 crons do `vercel.json` (budget-check, rescraping, reconciliation) sao POST-only mas Vercel Cron dispara GET -> 405, **nunca executam**. Fix: trocar handlers para `export async function GET` (com guard CRON_SECRET) + teste que afirma GET para toda entrada de crons. **S**

**i18n:**
20. **IB-I18N-01** - Paginas legais `privacy` e `cookies` com corpo PT hardcoded servidas a todos os locales (`<main lang="en-US">` em volta de texto PT = mentira de lang WCAG 3.1.2 + risco legal UE). A irma `/terms` ja demonstra o padrao correto (META Record + branches por locale). Fix: replicar padrao terms ou mover ao catalogo. **L**

**Testes:**
21. **TQ-TST-01** - Suite unitaria VERMELHA (4 arquivos / 10 testes) quebra o gate de CI (`ci.yml:123` -> build needs test -> deploy needs build); falhas de jobs sao AssertionError deterministicos (reproduzem em CI). Fix: corrigir BH-TEST-01..03 + TST-02 e restaurar verde. **M**
22. **TQ-TST-02** - angle-generation timeout por mock ausente de service-health/redis (mesma raiz de BH-TEST-03). **S**
23. **TQ-TST-06** - CI so roda `vitest run` (unit): integration DB-real (~18 arquivos incl. auth/security/cors), perf, e2e (12 flows), testes dos workers e mutation NUNCA rodam. Fix: jobs de CI para `test:integration` + e2e nightly/PR-label + testes dos workers. **L**
24. **TQ-TST-07** - Publishing (fluxo core) SEM testes: `src/lib/publishing/**` (11 fontes, 0 testes) e `publishing-worker` (sem script `test`). Fix: suite de dispatch por canal + script test no worker + incluir no CI. **L**
25. **TQ-TST-08** - video-worker (9 fontes, 0 testes apesar de declarar `test`) e publishing-worker sem script test. Fix: cobrir consumer/generate/storage espelhando image-worker. **L**

**Deps/Infra (face de deploy dos workers):**
26. **DC-WORK-01** - `apps/publishing-worker/Dockerfile:11` usa `npm ci --workspace=...` mas o `package.json` raiz NAO tem campo `workspaces` -> build falha; deps wildcard `*`. Fix: adicionar `"workspaces":["apps/*"]` OU build standalone; pinar deps. **M**
27. **DC-WORK-02** - publishing-worker com 3 definicoes de deploy contraditorias; `workers/publishing-worker/railway.toml` aponta para um `Dockerfile` inexistente (CI deploya exatamente desse dir); video-worker deployado pelo CI sem railway.toml/Dockerfile. Fix: UMA fonte de verdade por worker. **L**
28. **DC-DEP-01** - (mesmo nucleo de BH-SEC-01) 19 vulns com fix; ver item 4. **M**

**Docs/Git:**
29. **DD-GIT-01** - 333-355 mudancas uncommitted incl. 8 migrations untracked (2026-05-15..06-01) + diff de ~123 linhas no `schema.prisma` (MfaBackupCode, WebhookEventLog, DiagnosticoLead, DataExportRequest), sem ADR. Risco de perda + drift prod-vs-repo silencioso. Fix: commitar em main (regra Always Main), agrupado por tema; rodar `prisma migrate status` contra prod. **M**

> Resumo P1 por tema para sequenciamento: 3 fixes de mock (S, destravam o verde) -> 1 bump de deps (M) -> hardening de seguranca/crons (S-M) -> confiabilidade de workers (M cada) -> compliance LGPD (M) -> observabilidade (S-M) -> ECU/nav (M) -> i18n legal (L) -> cobertura de testes (L) -> commit do schema (M).

---

## P2 - Qualidade e Manutenibilidade (89 findings)

Agrupados por tema; IDs e locais preservados.

**Dependencia / toolchain (8):** BH-SEC-02 (protobufjs critical transitivo, baixa alcancabilidade), BH-SEC-03 (axios HIGH via posthog-node, nao alcancavel), BH-SEC-04 (next-intl <=4.9.1 open-redirect), BH-BUILD-02 (`next lint` deprecado + ESLint v8 EOL + eslint-config-next 14 vs Next 15 — `package.json:131-132`), DC-DEP-02 (npm audit nao e gate de PR; ajustado de P1 — `security.yml:8-14`), DC-CFG-01 (mesmo toolchain debt), DC-NODE-01 (Node floor 18 EOL; 4 versoes divergentes engines/.nvmrc/CI/Docker), DC-WORK-03 (Prisma 5 nos workers vs Prisma 6 no app; ajustado de P1 — schema sem previewFeatures, risco baixo).

**Build / infra config (10):** BH-BUILD-01 e DC-BUILD-01 (`next build` EXIT:124 timeout, nao confirmado verde — `next.config.ts`), DC-INFRA-01 (`Dockerfile:16` usa `npm install` nao `npm ci`; ajustado de P1), DC-INFRA-02 (`railway.toml` raiz builder DOCKERFILE x NIXPACKS conflitante), DC-INFRA-03 (`workers/image-worker/Dockerfile` roda como root, sem HEALTHCHECK), DC-WORK-04 (`workers/Dockerfile` `--only=production` + `npx tsc` quebra build), DC-CI-01 (`tsconfig.json:41` exclui `workers/**` do typecheck; deploy sem `needs` de test), DC-CFG-02 (`lighthouserc.js:12-17` mira rotas inexistentes/auth-gated), DC-ENV-01 (cron usa `pnpm tsx` em projeto npm-only — `workers/railway.toml:67`), DC-ENV-02 (`.env.example` drift: ~30 vars usadas nao documentadas).

**Sentry / observabilidade (10):** BH-OBS-01 (instrumentacao incompleta), OB-OBS-04 (falta `onRouterTransitionStart`), OB-OBS-05 (init Sentry duplicado client), OB-OBS-06 (crons image-sla/instagram-token-check nao agendados), OB-OBS-07 (logging sem correlation-id/request-id — `logger.ts:16`), OB-OBS-08 (216 `console.*` fora de testes ignoram sanitizacao PII), OB-OBS-09 (worker VIDEO sem deteccao de silencio — `worker-silence-detector.service.ts:11`), OB-OBS-10 (health checks nao refletem Anthropic/image-providers/Instagram), OB-OBS-11 (sem SLO/SLI de aplicacao), OB-OBS-12 (runbooks com deadends: endpoints inexistentes/caminhos errados — `docs/runbook.md:25,83,92,154`).

**Seguranca hardening (6):** SA-SEC-03 (webhook Cal.com inalcancavel pelo middleware; ajustado de P1 — fail-closed over-blocking, `middleware.ts:10-21`), SA-SEC-05 (suite RED CSP middleware), SA-SEC-06 (env divergentes `WORKER_AUTH_SECRET` vs `WORKER_AUTH_TOKEN`), SA-SEC-07 (key-manager degrada silenciosamente para base64 — `key-manager.ts:30-44`), SA-SEC-08 (rate-limit por IP burlavel via XFF spoof — `blog-public.ts:57`), SA-SEC-09 (brute-force de login client-cooperativo — `useAuth.ts:96`).

**Consistencia de API (7):** AP-API-02 (DELETE jobs sem caller; ajustado de P1), AP-API-03 (6 envelopes de erro coexistem; handler central morto; ajustado de P1 — `base.ts:8`, `api-auth.ts:60`), AP-API-04 (erros tipados em catch{} -> 500; ajustado de P1, magnitude superestimada), AP-API-05 (cron fail-open, espelho de SA-SEC-01), AP-API-06 (OpenAPI cobre 52/295 rotas, paths obsoletos, sem documentar Idempotency-Key), AP-API-07 (shape de paginacao diverge do tipo `PaginatedResponse`), AP-API-08 (rotas legacy posts/sources/compliance standalone sem Sunset).

**Frontend / ECU (3):** FE-03 (sem `(protected)/error.tsx` — erro destroi o app-shell), FE-04 (cores hex semanticas hardcoded quebram dark mode — `RollbackConfirmModal.tsx:83`), FE-05 (teste login.a11y RED por timeout axe + cobertura axe so no login).

**Banco - integridade/retencao (5):** DB-03 (schema.prisma nao reflete ~13 indices B-tree + ~16 GIN trgm; ajustado de P1 — prod usa `migrate deploy` que nao dropa), DB-05 (default `authorName='Pedro Murta'` em `schema.prisma:879` — **provavelmente STALE**, ver caveat abaixo), DB-06 (Theme sem `@@unique([painId,caseId])` -> dedup nao-atomico + N+1), DB-07 (migration add_data_export_request nao idempotente), DB-08 (RLS efetivamente bypassado pelo Prisma role dono — `tenant_isolation_audit_rls`).

**Workers - confiabilidade extra (9):** WK-WRK-08 (silence-detector ignora VIDEO), WK-WRK-09 (colisao WorkerHealth reconciliation grava type SCRAPING), WK-WRK-10 (`publish()` SSE orfao, broker in-process — confirma loop 05-27 item 018), WK-WRK-11 (crons image-sla/blog-scheduler fora do vercel.json), WK-WRK-12 (consumer sem idempotencia, re-processa DONE = custo duplicado), WK-WRK-13 (retry manual no-op para image/scraping/theme), WK-WRK-14 (drift de deps workers vs app), WK-WRK-15 (scraping-worker usa BullMQ sobre URL REST do Upstash via string-replace), WK-WRK-16 (scraping-worker engole erros por-fonte; `update` nao `upsert` para IDLE).

**Compliance (7):** CP-COMP-02 (TTL de ApiUsageLog nunca implementado; ajustado de P1 — sem PII, e cost/scalability), CP-COMP-04 (exclusao de conta do operador prometida na UI mas inexistente), CP-COMP-05 (ScrapingAuditLog/AlertLog/AuditLog sem purga apesar de TTL), CP-COMP-06 (3 export builders com mascaramento divergente — `compliance/export-builder.ts:36` sem select), CP-COMP-07 (endpoint legal-basis so cobre scraping), CP-COMP-08 (auditoria fragmentada audit_logs vs alert_logs), CP-COMP-11 (Lead sem operatorId enquanto Source/ScrapedText tem — PII cross-tenant se multi-operador, confidence baixa).

**i18n / branding (7):** IB-BRAND-02/03/04 (persona/contato/seed "Pedro Murta" — **provavelmente STALE**), IB-I18N-02 (bug hreflang cookies usa `en`/`it` invalidos; ajustado de P1 — `cookies/page.tsx:9`), IB-I18N-03 (chrome PT hardcoded no blog publico), IB-I18N-04 (metadata title/description PT em ~27 rotas), IB-I18N-05 (`validate:i18n` existe mas nao plugado no CI).

**Testes (9):** TQ-TST-03 (middleware CSP stale), TQ-TST-04 (jobs DELETE stale), TQ-TST-05 (login a11y timeout), TQ-TST-09 (`src/lib/auth/**` 8 helpers sem teste; ajustado de P1), TQ-TST-10 (threshold 80% nunca aplicado — falta `--coverage`), TQ-TST-11 (mutation gate Stryker inerte), TQ-TST-12 (testes LGPD/PII fora do CI), TQ-TST-13 (e2e rasos com auto-skip — funil CX-04 nao validado), TQ-TST-15 (handler central de erro->status sem testes).

**Docs / drift (7):** DD-DOC-01 (OpenAPI 52/295, gate CI conta >=47, descreve NextAuth; ajustado de P1 — API interna), DD-DOC-02 (PENDING-DECISIONS vencido INT-122/INT-124; ajustado de P1 — owner ja Corgnati), DD-DOC-03 (COMP-004 marcado pendente mas JA implementado), DD-DOC-04 (README "Next 14"/"25 entidades" vs real 15.5.14/52 models — parte Murta provavelmente stale), DD-DOC-05 ("Pedro Murta" em 13 docs — **provavelmente STALE**), DD-DOC-06 (reports canonicos stale: NextAuth/Next14 — `DEVOPS-REPORT.md:89`, `scripts/check-env-completeness.sh:11`), DD-DOC-07 (sem ADRs para ~8 features recentes: MFA, webhook log, diagnostico PII, data export, tenant isolation).

> **Caveat de staleness sobre "Pedro Murta" (DB-05, IB-BRAND-02/03/04, DD-DOC-04 parcial, DD-DOC-05):** a verificacao adversarial **confirmou como falso/stale** dois findings irmaos do mesmo tema (IB-BRAND-01 = false_positive; sub-claim de DD-DOC-01 sobre contato `pedro@murta.com` ja e `pedro@corgnati.com`; DB-02 achou a migration limpa com `Pedro Corgnati`). A identidade canonica e Pedro Corgnati e a corrupcao mass-replace foi revertida via HEAD em 2026-06-08. Estes findings entram como reportados por nao terem verificacao propria, mas devem ser **re-validados contra o disco atual antes de qualquer acao** — a hipotese forte e que todo o residuo "Murta" ja foi sanado.

---

## P3 - Backlog / Nice-to-have (24 findings)

- **BH-SEC-05** SDK Anthropic moderate (Memory Tool nao usado); **BH-SEC-06** vulns dev/build-only.
- **SA-SEC-10** worker token estatico sem rotacao; **SA-SEC-11** JSON-LD DOMPurify breakout `</script>`.
- **AP-API-09** sub-rota legacy `/api/posts/[id]/linkedin-format` consumida sem twin v1.
- **FE-06** loading.tsx/not-found.tsx incompletos em rotas core; **FE-07** link `/docs/*.md` no AnalyticsDashboard (deadend 404).
- **DB-01** schema/migrations uncommitted (ajustado de P1 -> changeset WIP consistente); **DB-02** comentario editado em migration aplicada (ajustado de P1; a parte Murta = falso-positivo stale); **DB-09** onDelete inconsistente sem cascade de erasure de Operator; **DB-10** `ImageJob.contentPieceId` denormalizado sem FK; **DB-11** status stringly-typed onde enums existem.
- **WK-WRK-17** healthchecks 200 estatico sem liveness real; **WK-WRK-18** drift de doc threshold silence-detector (30min vs 5min).
- **CP-COMP-09** docs legais versionados sem fluxo de re-aceite; **CP-COMP-10** unsubscribe prometido na politica mas nao implementado; **CP-COMP-12** DELETE de lead nao honra LEGAL_HOLD.
- **OB-OBS-13** video-worker nao declarado em railway.toml; **OB-OBS-14** dedup do alerts dispatcher por type apenas.
- **IB-BRAND-05** residuo Murta em README/docs (provavelmente stale).
- **TQ-TST-14** teste a11y permanentemente skipado (`@axe-core/playwright` nao instalado).
- **DC-DOC-01** README/Dockerfile dizem "Next 14" vs 15.5.14.
- **DD-DOC-08** docs de governanca sem revisao mensal desde 2026-04-23; **DD-DOC-09** sem CHANGELOG + `docs/runbook.md` untracked.

---

## Roadmap de Remediacao Sequenciado

### Onda 0 - Higiene pre-deploy (1 dia) — DEPENDENCIA DURA de tudo
- **DD-GIT-01:** commitar schema + 8 migrations + componentes/docs em main, agrupado por tema. Rodar `prisma migrate status` contra prod. Se as migrations ja estao em prod, escala DD-GIT-01 -> P0.
- **Effort agregado:** ~M (meio dia a 1 dia).

### Onda 1 - P0 Bloqueadores (2-3 dias)
- AP-API-01 (injetar Idempotency-Key no apiClient + form publico). WK-WRK-01 (prisma generate nos Dockerfiles). WK-WRK-02 (consolidar publishing-worker, eliminar stub).
- **Dependencias:** WK-WRK-02 cruza com DC-WORK-01/02 (deploy config) — fazer junto.
- **Effort agregado:** 3 x M ≈ 2-3 dev-days. **Gate: nenhum deploy antes desta onda fechar.**

### Onda 2 - P1 Antes do lancamento (2-3 semanas)
- **2a (destravar CI, ~1 dia):** BH-TEST-01/02/03 + TQ-TST-02 (mocks) -> TQ-TST-01 verde. **Dependencia:** habilita TQ-TST-06/11 (mutation exige baseline verde).
- **2b (deps + seguranca, ~3 dias):** DC-DEP-01/BH-SEC-01/SA-SEC-04 (bump Next + audit fix) -> revalidar build. SA-SEC-01 (crons fail-closed). SA-SEC-02 (safeFetch SSRF).
- **2c (workers, ~1 semana):** WK-WRK-03/04/05/06/07 + DC-WORK-01/02. **Dependencia:** apos Onda 1.
- **2d (observabilidade, ~2 dias):** OB-OBS-01/02/03.
- **2e (compliance + banco, ~3 dias):** CP-COMP-01, CP-COMP-03, DB-04 (retencao/portabilidade/TTL — frequentemente o mesmo cron).
- **2f (ECU + i18n + cobertura, ~1 semana):** FE-01/02, IB-I18N-01, TQ-TST-06/07/08.
- **Effort agregado:** ~2-3 semanas (1-2 devs).

### Onda 3 - P2 Qualidade/manutenibilidade (3-4 semanas)
- Toolchain (BH-BUILD-02/DC-CFG-01/DC-NODE-01), build/infra config (10 itens), Sentry completo (BH-OBS-01 + OB-OBS-04..12), seguranca hardening (SA-SEC-05..09), consistencia API (AP-API-02..08 incl. envelope unico), workers extras (WK-WRK-08..16), compliance restante, banco integridade, **re-validar e fechar todo o residuo Murta** (DB-05, IB-BRAND-*, DD-DOC-04/05), cobertura de testes.
- **Dependencia:** envelope de erro unico (AP-API-03) facilita FE/i18n de mensagens; mutation gate (TQ-TST-11) depende da Onda 2a.
- **Effort agregado:** ~3-4 semanas.

### Onda 4 - P3 Backlog (continuo)
- Endurecimento (rotacao de token, RLS FORCE, liveness real), polish de docs (CHANGELOG, ADRs, governanca mensal), nice-to-haves de UX. Tratar em sprints de manutencao.

---

## Pontos Fortes

- **Seguranca de base solida e testada:** CSRF HMAC-SHA256 session-bound timing-safe, PII em AES-256-GCM com auth-tag, MFA completo com backup codes CSPRNG consumidos atomicamente, headers de seguranca completos + CSP com nonce por-request, anti-open-redirect, webhook Cal.com com HMAC fail-closed + anti-replay + dedup race-safe, isolamento multi-tenant do scraping-audit.
- **Banco bem modelado:** 52 models, indexacao rica em hot-paths (composites + 16 GIN trgm), trilhas de auditoria robustas (PIIRevealAudit/ScrapingAuditLog com correlationId+TTL), PII de lead criptografada com contactHash, migrations recentes idempotentes; `prisma validate` limpo.
- **Frontend maduro:** component-kit rico, LoginForm referencia de a11y, `sonner` toast + estados loading/empty/error consistentes, biblioteca de estados de rota (RouteErrorState/LoadingState/NotFoundState), dark mode class-based com tokens semanticos.
- **i18n robusto:** paridade PERFEITA de chaves (519 em cada um dos 4 locales, 0 missing/0 extra), fallback de locale, redirect 308 de locale invalido, formatters Intl locale-aware; `/terms` demonstra o padrao localizado correto.
- **Observabilidade conceitualmente boa:** suite rica de health checks, sanitizacao de PII no `beforeSend` do Sentry, deteccao de silencio de worker com ciclo de vida de alerta, alertas de custo em 3 camadas, 4 runbooks com matriz de escalonamento e RTO de restore.
- **CI de PR e secret-scanning reais:** typecheck+lint+test (com Postgres+Redis+migrate) + validate-openapi + build encadeados; gitleaks/TruffleHog como gate de PR; Zod env-validation fail-closed; backup logico mensal.
- **COMP-004 (retencao LGPD) JA implementado** (contradiz os docs que o marcam como pendente) — `src/lib/lgpd/retention.ts` + cron lgpd-purge existem.
- **Convencao de idempotencia e seguranca de credenciais bem desenhadas** (uuidv7 nas rotas irmas, distincao ORCH/RUNTIME, `.env` gitignored).

---

## Apendice A - Falsos-positivos descartados

| ID | Dimensao | Motivo do descarte |
|---|---|---|
| **IB-BRAND-01** | i18n/branding | "Identidade Pedro Murta renderiza em producao (JSON-LD + byline default)" — **FALSO**. Verificacao na fonte: `schema-ld.ts:26-27` ja aponta para `pedrocorgnati`, `constants/blog.ts:10` = `Pedro Corgnati`, `blog-admin.service.ts:70` e `validators/blog-article.ts:29` idem, `mdx-exporter.test.ts:15` idem; `grep -rn 'Murta' src/` = 0 ocorrencias. Bate com a reversao mass-replace via HEAD em 2026-06-08. Achado gerado contra snapshot stale (pre-revert). |

**Nota:** os demais findings sobre "Pedro Murta" (DB-05, IB-BRAND-02/03/04/05, DD-DOC-04 parcial, DD-DOC-05) NAO foram verificados individualmente e por isso entraram como reportados (P2/P3), mas a verificacao de IB-BRAND-01, DD-DOC-01 e DB-02 indica fortemente que **todos sao stale** — devem ser confirmados e fechados em bloco na Onda 3. Itens que foram apenas `severity_adjusted` (downgrades de severidade) NAO sao falsos-positivos: permanecem no corpo na severidade ajustada (DB-01/02/03, AP-API-02/03/04, SA-SEC-03, CP-COMP-02, DC-DEP-02/WORK-03/INFRA-01, DD-DOC-01/02, IB-I18N-02, TQ-TST-09).

---

## Apendice B - Cobertura e limites desta revisao

- **Metodo:** revisao estatica + verificacao adversarial sobre logs em `/tmp/if-review/` (test.log, build.log, npm-audit.json). A camada de verificacao reexecutou `vitest` real para confirmar as falhas de teste (TEST-01..03, jobs DELETE) e parseou o `npm audit` por advisory.
- **Nao confirmado em runtime:**
  - `next build`: **resolvido apos a sintese** (ver Nota de correcao 2) — completa de fato (`Compiled successfully in 23.4min` + 370 paginas estaticas); os EXIT:124 eram timeout do harness. Reclassificado como P1 de performance de build (~25-30min total), nao hang.
  - Estado real do `_prisma_migrations` em producao: o drift schema<->DB (DB-03) e o risco prod-vs-repo de DD-GIT-01 foram inferidos por leitura cruzada, sem acesso ao DB de prod. **DD-GIT-01 escala para P0 se as 8 migrations ja foram aplicadas em prod.**
  - Alcancabilidade exata de advisories transitivos (ws/qs/uuid no Supabase Realtime, protobufjs RCE, axios SSRF) inferida por `npm ls`, nao por trace de execucao — daI a classificacao P1 (nao P0) de DEP-01.
  - Conexao TCP do scraping-worker ao Upstash (WK-WRK-15) e qual `railway.toml` o Railway le como autoritativo (WK-WRK-02/07) nao validados ao vivo.
- **Nao auditado exaustivamente:** authz per-route das ~150 rotas `/api/v1` (amostrado); RLS SQL real no Postgres; cada um dos 216 `console.*` (hotspots amostrados); completude de mensagens i18n por valor nos 4 locales (so paridade de chaves + heuristica); responsividade mobile profunda; conteudo integral de KEY-ROTATION/csrf-protection/idempotency docs.
- **Single-tenant assumido por design** (UserRole so OPERATOR, single-user-guard): por isso rotas `/api/admin/*` com apenas `requireSession` e a ausencia de `Lead.operatorId` (CP-COMP-11) ficam com confidence baixa, pendentes de confirmacao do modelo de tenancy.
- **Modelo de IDs:** findings foram namespaced por dimensao (BH/SA/AP/FE/DB/WK/CP/OB/IB/TQ/DC/DD) para evitar colisoes (ex.: `SEC-01` existia em build-health E em security-authz; `WRK-*` em workers vs `WORK-*` em deps). O ID original esta preservado apos o prefixo.

---

## Apendice C - Critica de completude e refinamentos (camada critico)

Um agente critico de completude revisou o relatorio acima. Resumo do que ele encontrou (1 ponto ja foi resolvido por esta revisao manual e esta anotado inline):

**Dimensoes nao cobertas / rasas (gaps a fechar numa proxima passada):**
- **Performance/escalabilidade** ficou em branco: nenhuma medicao de latencia do funil publico, query perf, bundle size ou Core Web Vitals. Para um produto cuja porta de entrada e uma landing de captacao, isso e revenue-relevante. (`lighthouserc.js` mira rotas inexistentes — DC-CFG-02.)
- **Anti-abuso/bot no funil publico `/diagnostico`:** form publico que coleta PII sem CAPTCHA/honeypot/bot-gate; so ha rate-limit por IP burlavel via XFF (SA-SEC-08).
- **Authz per-route nao exaustiva** (so amostrada nas ~150 `/api/v1`): rotas `/api/admin/*` com apenas `requireSession` e o gap cross-tenant (CP-COMP-11) seguem em confidence baixa.
- **Email/deliverability e DR nao exercitados:** SPF/DKIM/bounce, unsubscribe prometido-mas-inexistente (CP-COMP-10), e restore/RTO dos runbooks nunca testados. Responsividade mobile e completude de VALORES i18n nao auditadas.

**Severidades a promover (recomendado):**
- **SA-SEC-07 (key-manager cai para base64 silenciosamente) -> P1, nao P2.** `key-manager.ts` engole excecao em `encrypt()` E `decrypt()` e degrada para `Buffer...base64`. Isso torna o headline "PII AES-256-GCM" **condicional**, nao uma forca incondicional. Item de maior alavancagem do refinamento.
- **SA-SEC-09 (brute-force de login client-cooperativo, sem lockout server-side) -> P1** (credential-stuffing aberto).
- **OB-OBS-08 (216 `console.*` fora do sanitizador de PII) -> P1** (exposicao de compliance LGPD).
- **Contradicao a reconciliar:** "isolamento multi-tenant do scraping-audit" aparece em Pontos Fortes enquanto DB-08 diz que o RLS e bypassado pelo role dono do Prisma. O risco cross-tenant (CP-COMP-11) depende disso.

**Afirmacoes a calibrar:**
- ~~"`next build` verde nunca observado"~~ -> **RESOLVIDO nesta revisao** (Nota de correcao 2): o build completa (`Compiled successfully in 23.4min` + 370 paginas), nao e hang; reclassificado P1 de performance.
- **"523/533 testes verdes" e unit-only:** `vitest.config.ts` exclui `tests/integration/**` e `src/tests/e2e/**` e os workers; o pass-rate de integration/e2e/worker e DESCONHECIDO, nao verde.
- **"Paridade PERFEITA de chaves i18n" coexiste com VALORES nao-traduzidos em massa** (IB-I18N-01/03/04) — apresentar a paridade como forca exige o caveat de valores.
- **Scores de readiness (40-68 / 50 global) nao tem rubrica** — sao composito subjetivo, util como ordenacao relativa, nao metrica reproduzivel.
- **DD-GIT-01 (drift prod-vs-repo) e DB-03 (indices) foram inferidos sem acesso ao DB de prod** — rodar `prisma migrate status` contra prod e o desbloqueio nao-negociavel da Onda 0; se as 8 migrations ja estao em prod, DD-GIT-01 vira P0.

**O que da confianca:** os 3 P0 foram verificados por execucao real e sao os achados mais robustos; a camada adversarial reexecutou `vitest` e classificou corretamente os 10 RED como test-side (mocks stale), nao defeitos de producao; a chamada de staleness do "Murta" bateu com o disco (`grep src` = 0). A metodologia auto-divulga seus limites, o que torna os gaps acima refinaveis e nao fatais.