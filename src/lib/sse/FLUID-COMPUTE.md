# SSE x Vercel Fluid Compute — Nota de compatibilidade (TAREFA-018 / ST007)

Referencia: Vercel Knowledge Updates 2026-02-27. Este documento e o artefato
derivado de ST007: registra o modo de execucao do broker SSE
(`src/lib/sse/broker.ts`) sob Fluid Compute, os limites de duracao de stream e
o comportamento de keep-alive, alem do contrato dos produtores de evento.

## Modo de execucao

- Todas as 5 rotas SSE declaram `export const runtime = 'nodejs'` e
  `export const dynamic = 'force-dynamic'`. Fluid Compute roda funcoes Node sob
  um modelo de concorrencia in-instance: uma mesma instancia atende multiplas
  requisicoes concorrentes, reaproveitando o processo entre invocacoes.
- O broker e **in-process**: o registro de assinantes
  (`Map<${channel}:${operatorId}, Set<Listener>>`) vive na memoria da instancia.
  `publish(channel, operatorId, event)` so alcanca streams abertos **na mesma
  instancia** que recebeu o push.

## Limites de duracao de stream

- Streams SSE sao conexoes longas. Sob Fluid Compute a duracao maxima e limitada
  pelo `maxDuration` da funcao (config do projeto / plano). Quando a janela
  expira, a conexao e encerrada pela plataforma e o **cliente reconecta** via
  `useSSE` (full jitter, ST001) — sem perda de continuidade percebida porque os
  canais `notifications`/`approvals`/`jobs`/`queue` sao push e o `health` e
  auto-derivado por tick.
- `request.signal` aborta quando o cliente desconecta OU quando a plataforma
  encerra a invocacao; o broker limpa timers (heartbeat + tick) e desinscreve o
  listener no `cleanup`/`cancel` (sem leak de assinantes).

## Keep-alive

- Heartbeat de comentario (`: hb`) a cada **25s** (`HEARTBEAT_MS`) mantem a
  conexao viva atraves de proxies e evita idle-timeout intermediario.
- Header `X-Accel-Buffering: no` + `Cache-Control: no-cache, no-transform`
  desativam buffering de proxy para entrega imediata dos eventos.
- Na abertura o stream emite `: open` para destravar o `EventSource` do cliente
  antes do primeiro evento real.

## Limitacao multi-instancia e caminho de evolucao

- Sendo in-process, sob **multiplas instancias** Fluid Compute um `publish`
  originado na instancia A nao alcanca um stream aberto na instancia B. Para
  entrega cross-instancia e necessario um bus externo (ex.: Redis pub/sub —
  `src/lib/redis.ts` ja existe no workspace).
- O contrato de `publish(channel, operatorId, event)` foi desenhado para ser
  reimplementado sobre Redis **sem alterar os route handlers**: basta trocar a
  implementacao do registro de assinantes por subscribe/publish no Redis.

## Contrato dos produtores de evento (push)

Os canais push entregam eventos quando o codigo de dominio chama `publish`:

| Canal           | Produtor (onde chamar `publish`)                                  | Payload (de `events.ts`) |
|-----------------|-------------------------------------------------------------------|--------------------------|
| `jobs`          | transicoes de ciclo de vida do job (worker/image/video)           | `JobEvent`               |
| `queue`         | apos cada mudanca de profundidade da fila                          | `QueueEvent`             |
| `notifications` | ao criar uma `Notification` (Prisma)                              | `NotificationEvent`      |
| `approvals`     | transicoes pending/approved/rejected (TAREFA-010 reconciliation)  | `ApprovalEvent`          |
| `health`        | auto-derivado por tick no route (`probe()`), sem produtor externo  | `HealthEvent`            |

Nota de dependencia (Zero Assumido): o registry de jobs
(`src/lib/jobs/registry.ts`) expoe apenas `getJobStatus(jobId)` (consulta
pontual), **sem enumeracao por operador**. Por isso `jobs` e `queue` sao
push-only e nao derivam snapshot inicial de uma lista inexistente. Quando uma
enumeracao por operador for materializada, adicionar `initial`/`onTick` nos
respectivos routes sem alterar o broker.

## Cutover de polling -> SSE (ST005/ST006)

Ordem de cutover por canal: `health -> queue -> jobs -> approvals ->
notifications`. Criterio de "SSE verde" por canal (ST005): 5 minutos consecutivos
sem erro de stream, heartbeat entregue dentro de 500ms da janela de 25s, e
reconexao automatica observada ao menos uma vez sem perda de evento. So apos o
verde remove-se o polling antigo do canal (ST006), mantendo o hook de polling sob
feature flag por uma janela de observacao para rollback. `useSSE` ja embute o
fallback de polling (`pollUrl`) para suportar o cutover gradual sem big-bang.
