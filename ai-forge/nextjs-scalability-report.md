# Scalability Report — Inbound Forge
Gerado por: `/nextjs:scalability`
Data: 2026-04-06

---

## Evidências Coletadas

```bash
rg "Promise.(all|allSettled)" src --glob "*.ts" --glob "*.tsx" -l
# → 48 arquivos — analisados os que têm writes

rg "Promise.all" src --glob "*.ts" --glob "*.tsx" -A 6 -n | grep -E "(Promise.all|.create|.update|.delete|.upsert)"
# → Promise.all com writes: apenas N=2 (apiUsageLog.create x2 em channel-adaptation e angle-generation)
# → Todos os demais são reads paralelos (count + findMany) — OK

rg "executeRawUnsafe|executeRaw\b" src --glob "*.ts" --glob "*.tsx" -n
# → src/lib/instagram/token-manager.ts:61 — $executeRaw (tagged template, tipado) OK
# → src/tests/contracts/helpers.ts:160,165,168 — $executeRawUnsafe em tests (aceitável)
# → src/app/api/v1/onboarding/progress/route.ts:62 — $executeRaw (tagged template) OK

rg "new Map()|new Set()" src --glob "*.ts" --glob "*.tsx" -n | grep -v "test|spec"
# → src/components/health/AlertLogPanel.tsx:30 — useState(new Set()) — React state UI, OK

rg "skip|offset" src --glob "*.ts" -n | grep "prisma|findMany"
# → 4 endpoints com offset pagination

rg "console.(log|error|warn)" src --glob "*.ts" --glob "*.tsx" -n | grep -v "//"
# → 95 ocorrências — sem logger estruturado

rg "retry|circuit.?breaker|backoff" src --glob "*.ts" -l
# → retry existe em publishing-queue.service.ts e instagram.service.ts
# → sem circuit breaker em chamadas externas

rg "await fetch(" src --glob "*.ts" | grep -v "test|spec"
# → worker-client.ts:33 — sem timeout
# → src/hooks/*.ts — client-side, sem AbortController
# → src/lib/image-pipeline.ts — AbortSignal.timeout(30_000) ✅

ls src/app/api/health/ src/app/api/v1/health/
# → /api/health (público) ✅
# → /api/v1/health/detailed (autenticado) ✅
# → /api/v1/health/internal (secret) ✅
# → /api/worker-health ✅
```

---

## Scorecard

| Área | Score | Gaps |
|------|-------|------|
| Multi-tenancy | N/A | Single-user, não aplicável |
| Promise.all com writes | ✅ 10/10 | N=2 apenas, sem risco de pool saturation |
| $executeRaw seguro | ✅ 9/10 | Tagged templates tipados; raw em tests only |
| Resiliência (retry) | ⚠️ 6/10 | Retry no publishing; sem retry/timeout no worker-client |
| Resiliência (circuit breaker) | ⚠️ 3/10 | Ausente para chamadas externas |
| Connection Pool | ⚠️ 5/10 | Sem parâmetros pgbouncer na DATABASE_URL |
| Stateless (horizontal scaling) | ✅ 9/10 | Redis para filas/rate-limit; BullMQ workers isolados |
| Distributed locks | ⚠️ 4/10 | Ausente no publishing (risco de duplicação irreversível) |
| Logging estruturado | ⚠️ 4/10 | 95 console.* sem logger centralizado |
| Health checks | ✅ 10/10 | 3 níveis (público/autenticado/interno) |
| Tracing distribuído | ⚠️ 2/10 | Sentry configurado; sem OTel distributed tracing |
| Pagination | ⚠️ 7/10 | 4 endpoints com offset (volume atual OK) |
| Background Jobs | ✅ 9/10 | BullMQ + heartbeat + graceful shutdown |
| Cache | ✅ 8/10 | getCached() com fallback Redis, TTLs centralizados |
| Rate Limiting | ✅ 9/10 | Redis rate limiter atômico com pipeline |

**Score Global: 72/100**

---

## Tasks por Status

| Task | Título | Prioridade | Status |
|------|--------|-----------|--------|
| T001 | Connection Pool Vercel Serverless | ALTA | ✅ COMPLETED |
| T002 | Timeout no Worker Client | ALTA | ✅ COMPLETED |
| T003 | Retry com Backoff para Worker Client | MÉDIA | ⏳ PENDENTE |
| T004 | Logger Estruturado Centralizado | MÉDIA | ✅ COMPLETED |
| T005 | Cursor Pagination (tech debt) | BAIXA | ⏳ PENDENTE |
| T006 | Distributed Lock para Publishing | MÉDIA | ✅ COMPLETED |

---

## Pontos Positivos (Não Alterar)

- **BullMQ workers**: arquitetura com graceful shutdown (SIGTERM/SIGINT) e dead-letter handling implementados.
- **Rate limiting**: implementação atômica com Redis pipeline (INCR + EXPIRE), TTL até meia-noite UTC.
- **Health checks**: 3 níveis de granularidade com latência medida, sem stack trace exposto.
- **Fallback em serviços externos**: image-pipeline tem Ideogram → Flux → estático com AbortSignal.timeout(30s).
- **Cache-manager centralizado**: TTLs documentados, graceful degradation se Redis cair.
- **Feature flags**: PostHog com fail-safe (false se indisponível), shutdown gracioso.
- **Promise.all sem saturação de pool**: os usos com writes são apenas N=2 (logging de tokens), sem risco.
- **Sentry + log-sanitizer**: PII removido antes do envio, sanitização centralizada.
