# Legacy API Deprecation Map (TASK-016)

Parity check das 13 rotas legadas `/api/*` com twin sob `/api/v1/*`. Quando o handler
legacy diverge do v1, a rota **NAO** e shimada: registra-se `PENDENTE-RECONCILIACAO` e
a rota legada permanece intacta. Apos o v1 ser reconciliado ao contrato legacy (validado
por teste offline), a rota legada passa a `OK` e e shimada via `proxyToV1`.

## Resultado: 8/13 SHIMADA (cluster knowledge) — 5/13 PENDENTE-RECONCILIACAO

As 8 rotas do cluster `knowledge/*` foram reconciliadas (v1 estendido para `GET,PATCH,DELETE`
nos `*/[id]` + paridade de filtros/contratos) e estao shimadas via `proxyToV1` (Sunset
2026-06-30). As 5 rotas restantes (`compliance/scraping-audit`, `posts`, `posts/[id]`,
`posts/[id]/approve`, `sources/[id]`) seguem `PENDENTE-RECONCILIACAO` e permanecem standalone.

> Atualizado 2026-05-31 (re-execucao TASK-016). A versao anterior deste MAP declarava
> "13/13 PENDENTE / 0 shimadas" porque a reconciliacao do cluster knowledge (TASK-031) havia
> sido revertida na sessao por falta de oracle offline. A reconciliacao foi posteriormente
> refeita corretamente (TASK-031/032) com testes unitarios que mockam `prisma`/`api-auth`
> e exercitam os handlers v1 + os shims legacy diretamente. Esses testes estao verdes
> (ver "Validacao" abaixo), entao o cluster knowledge agora e `OK` e shimado.

## Validacao (oracle offline)

Paridade do cluster knowledge validada por testes Vitest com `prisma`/`api-auth` mockados
(nao dependem de app + DB rodando):

- `src/app/api/v1/knowledge/__tests__/collections-contract.test.ts` — v1 + shims de colecao.
- `src/app/api/v1/knowledge/__tests__/detail-contract.test.ts` — v1 + shims `*/[id]`
  (GET 200 + headers `Deprecation`/`Sunset`/`Link`, 404 preservado, PATCH/DELETE via shim).
- `src/app/api/_legacy/__tests__/parity.test.ts` — guarda estrutural (SHIMADA delega ao v1
  + usa `deprecation-shim`; PENDENTE permanece standalone; helper presente).

`npm run test` (vitest run) verde para esses 3 arquivos (34 testes) em 2026-05-31.

## Criterio de paridade

`OK` = mesmos metodos HTTP, mesmos parametros (path/query/body), mesmo response shape,
mesmos status/codigos de erro. Qualquer divergencia => `PENDENTE-RECONCILIACAO`.

## Allowlist (13 rotas) — veredito

| # | Rota legada (`/api/...`)        | Metodos legacy   | Metodos v1         | Shim  | Paridade | Sunset     |
|---|---------------------------------|------------------|--------------------|-------|----------|------------|
| 1 | `compliance/scraping-audit`     | GET              | GET                | nao   | PENDENTE | -          |
| 2 | `knowledge/cases`               | GET, POST        | GET, POST          | proxy | OK       | 2026-06-30 |
| 3 | `knowledge/cases/[id]`          | GET, PATCH, DELETE | GET, PATCH, DELETE | proxy | OK     | 2026-06-30 |
| 4 | `knowledge/objections`          | GET, POST        | GET, POST          | proxy | OK       | 2026-06-30 |
| 5 | `knowledge/objections/[id]`     | GET, PATCH, DELETE | GET, PATCH, DELETE | proxy | OK     | 2026-06-30 |
| 6 | `knowledge/pains`               | GET, POST        | GET, POST          | proxy | OK       | 2026-06-30 |
| 7 | `knowledge/pains/[id]`          | GET, PATCH, DELETE | GET, PATCH, DELETE | proxy | OK     | 2026-06-30 |
| 8 | `knowledge/patterns`            | GET, POST        | GET, POST          | proxy | OK       | 2026-06-30 |
| 9 | `knowledge/patterns/[id]`       | GET, PATCH, DELETE | GET, PATCH, DELETE | proxy | OK     | 2026-06-30 |
| 10| `posts`                         | GET, POST        | GET, POST          | nao   | PENDENTE | -          |
| 11| `posts/[id]`                    | GET, PUT, DELETE | GET, PUT, PATCH, DELETE | nao   | PARCIAL  | -          |
| 12| `posts/[id]/approve`            | POST             | POST               | nao   | PENDENTE | -          |
| 13| `sources/[id]`                  | GET, PATCH, DELETE | GET, PATCH, DELETE | nao   | PARCIAL  | -          |

## Reconciliacao parcial 2026-06-01 (fechamento de gaps do v1 — fix de 405 ao vivo)

Auditoria de consumidores (grep no frontend) confirmou que NENHUM componente consome as
rotas legadas PENDENTE: o frontend ja migrou 100% para `/api/v1/*`. Porem o v1 estava
**incompleto** em duas rotas, gerando `405` ao vivo na UI. Os gaps foram portados do
contrato legacy (mesmos services), eliminando os bugs e habilitando o shim futuro:

- **`v1/posts/[id]` GET (NOVO):** o frontend le o detalhe do post via `GET /api/v1/posts/:id`
  (PublishAssistWizard, InstagramPublisherPanel, YouTube/TikTok export panels), mas o v1 so
  tinha PUT/PATCH/DELETE -> 405. Adicionado GET reusando `PostService.findById` (mesmos
  includes da rota legada). Paridade com legacy GET = total.
- **`v1/sources/[id]` PATCH + DELETE (NOVO):** SourceList (toggle/delete) e SourceForm (edit)
  chamam PATCH/DELETE em `/api/v1/sources/:id`, mas o v1 so tinha GET -> 405. Portados
  reusando os services `updateSource`/`deleteSource` (INT-093 protegida, INT-136 dominio
  bloqueado, DUPLICATE_URL preservados). Paridade com legacy PATCH/DELETE = total.

Validacao offline: `src/app/api/v1/__tests__/legacy-reconciliation-contract.test.ts`
(11 testes, mocka services + api-auth; 200/404/409/403/422/204).

### Por que `PARCIAL` (ainda nao shimadas) — divergencias residuais que exigem DECISAO

- **`sources/[id]` GET:** legacy retorna o objeto simples (`findSourceById`); v1 retorna a
  vista rica (`{source, metrics, compliance, logs}`). Shapes divergem. A GET simples legacy
  NAO tem consumidor (a UI usa a rica do v1), entao o shim e seguro na pratica, mas muda o
  contrato documentado -> decisao: aposentar a GET simples e shimar tudo, ou manter dual.
- **`posts/[id]` PUT/DELETE:** legacy PUT aplica guarda de imutabilidade via `PostService.update`
  (422 em status nao-editavel); o v1 PUT faz `prisma.update` direto sem essa guarda. DELETE:
  legacy responde `{success:true}`, v1 responde `{message:'Post removido'}`. Reconciliar exige
  decidir qual contrato vence (a guarda de imutabilidade do legacy parece a mais correta).
- **`posts/[id]/approve`:** v1 adiciona idempotencia + auto-UTM; legacy faz audit COMP-001
  direto. Comportamentos distintos -> decisao de produto.
- **`posts` (colecao):** params divergem (legacy `channel[]/status[]/search/scheduledFrom|To`
  vs v1 `channel/status/from|to`). Sem consumidor legacy, mas reconciliar = rever contrato de
  filtro do v1.
- **`compliance/scraping-audit` GET:** legacy tem modo agregado (relatorio LGPD) SEM twin v1;
  v1 so lista paginada. Shimar exigiria portar o relatorio agregado para o v1.

## Cluster knowledge (SHIMADA) — como foi reconciliado

- **\*/[id]:** v1 foi estendido para expor `GET, PATCH, DELETE` (antes so `PUT, DELETE`),
  alinhando os metodos legacy. DELETE e response shapes ajustados para paridade.
- **cases:** `CreateCaseSchema`/`findAll` reconciliados (status/`isDraft`, `_count`).
- **objections:** filtro `?type=` (campo `type`) preservado no v1.
- **pains:** filtro por `sectors` (array, `{has}`) + status preservado.
- **patterns:** filtro `?painId=` + validacao `KNOWLEDGE_020`/403 (painId) e
  `KNOWLEDGE_001`/404 (caseId) preservados no v1.
- Cada rota legada agora chama `proxyToV1(() => v1HANDLER(...), successor, { route, target })`
  do helper `src/lib/deprecation-shim.ts`, anexando `Deprecation: true`,
  `Sunset: Tue, 30 Jun 2026 23:59:59 GMT` e `Link: </api/v1/...>; rel="successor-version"`.
  Falha do proxy -> log estruturado + `502 { error: "legacy-shim-failed", target }`.

## Pendencias (PENDENTE-RECONCILIACAO) — gaps reais confirmados

- **posts/[id]:** v1 sem `GET`; legacy sem `PATCH` (legacy tem `PUT`, v1 tem `PATCH`). Metodos divergem.
- **sources/[id]:** v1 so `GET`; faltam as mutacoes (`PATCH`, `DELETE`) que o legacy expoe.
- **posts / posts/[id]/approve / compliance/scraping-audit:** handler/contrato divergem do v1
  (camada de servico + DTOs vs prisma direto + Zod) ou tem consumidores em ambos os lados;
  reconciliar v1 ao contrato legacy POR ROTA, com teste offline verde, antes de shimar.

## DO-NOT-MOVE (NUNCA deprecar) — inalterado

`health/*`, `cron/*`, `auth/*`, `instagram/*`, `integrations/tiktok/callback`, `[...not-found]`,
`_debug/*`, `log-error`, `docs`, `preview/*`, `worker-health`, `workers/*`, `image-jobs/*`,
`image-templates/*`, `video-jobs/*`, `visual-assets/*`, `cost/quotas`, `admin/*`,
`onboarding/state`, `blog-articles/*`, `content/[themeId]/*`, `compliance/legal-basis`,
`knowledge/{progress,scraped-texts,pains/[id]/cases}`.

## Pre-requisito para retomar a reconciliacao das 5 PENDENTE

1. App + DB rodando (`npm run dev`) OU novos testes unitarios com `prisma`/`api-auth` mockados
   (padrao ja estabelecido em `src/app/api/v1/knowledge/__tests__/*`).
2. Reconciliar o v1 ao contrato legacy POR ROTA, com o teste offline verde antes de shimar.
3. Trocar o handler legacy por `proxyToV1(...)` + headers de depreciacao e definir o Sunset.
