# Scalability Tasks — Inbound Forge
Gerado por: `/nextjs:scalability`
Data: 2026-04-06
Config: `.claude/projects/inbound-forge.json`

---

## Contexto

Inbound Forge é um sistema **single-user** (operador fixo `operator-pedro`) hospedado na Vercel com workers Railway para scraping/image/publishing. A análise revelou um sistema já bem estruturado em multi-tenancy (por ser single-user, isolamento de tenant não se aplica), resiliência parcial, e alguns gaps relevantes de escalabilidade.

---

## STATUS GERAL

| Categoria | Status | Detalhe |
|-----------|--------|---------|
| Multi-tenancy | N/A | Single-user — isolamento não aplicável |
| Resiliência (circuit breaker) | ⚠️ PARCIAL | Retry existe em publishing; sem circuit breaker nas chamadas externas |
| Horizontal Scaling (stateless) | ✅ OK | Redis para filas/rate-limit; sem estado em memória crítico |
| Database (connection pool) | ⚠️ PENDENTE | Sem `connection_limit` na DATABASE_URL para serverless |
| Bulk ops / Promise.all | ✅ BAIXO RISCO | Promise.all apenas com 2–5 operações (reads + N=2 writes de log) |
| Offset pagination | ⚠️ MÉDIA | 4 endpoints usam skip/offset — escala até ~100k rows OK |
| Background Jobs | ✅ OK | BullMQ scraping + image workers, graceful shutdown |
| Observability (logs) | ⚠️ PARCIAL | console.* (~95 ocorrências) — sem logger estruturado centralizado |
| Observability (tracing) | ⚠️ AUSENTE | Sentry configurado mas sem OpenTelemetry/distributed tracing |
| Health checks | ✅ OK | `/api/health`, `/api/v1/health/detailed`, `/api/v1/health/internal` |
| Cache stampede | ⚠️ BAIXO RISCO | getCached() sem lock — OK para single-user, risco em escala |
| Distributed locks | ⚠️ AUSENTE | Sem lock para operações críticas (publishing queue race condition) |
| Worker client fetch timeout | ⚠️ PENDENTE | `workerFetch()` sem timeout explícito |
| Client-side fetch timeout | ⚠️ PENDENTE | Hooks React sem AbortController |

---

## TASKS

### T001 — Connection Pool para Vercel Serverless
**Status:** ✅ COMPLETED
**Tipo:** SEQUENTIAL
**Prioridade:** ALTA
**Arquivos:**
- modificar: `.env.example` (documentar parâmetros)
- modificar: `src/lib/prisma.ts` (adicionar log de aviso se pool não configurado)

**Descrição:**
A `DATABASE_URL` do Supabase via pgBouncer (transaction mode) tem pool de 20-25 conexões. No Vercel serverless cada invocação fria pode criar nova conexão. Adicionar `?pgbouncer=true&connection_limit=5` na DATABASE_URL garante que cada instância serverless não use mais do que 5 conexões.

**Evidências:**
- `prisma/schema.prisma:7` — sem parâmetros de pool
- `src/lib/prisma.ts:6` — PrismaClient sem pool config explícita

**Fix:**
```bash
# .env.example
DATABASE_URL="postgresql://...?pgbouncer=true&connection_limit=5"
DIRECT_URL="postgresql://..."  # para migrations (sem pgbouncer)
```

**Critérios de Aceite:**
- [ ] DATABASE_URL documentada com parâmetros pgbouncer no .env.example
- [ ] Aviso de desenvolvimento se connection_limit não configurado

---

### T002 — Timeout no Worker Client
**Status:** ✅ COMPLETED
**Tipo:** SEQUENTIAL
**Prioridade:** ALTA
**Arquivos:**
- modificar: `src/lib/worker-client.ts`

**Descrição:**
`workerFetch()` em `src/lib/worker-client.ts:33` faz `fetch()` para workers Railway sem timeout. Se o worker Railway estiver lento/indisponível, a API Route vai bloquear indefinidamente até o timeout padrão do Vercel (300s).

**Evidências:**
- `src/lib/worker-client.ts:33` — `fetch()` sem `signal: AbortSignal.timeout()`

**Fix:**
```typescript
// workerFetch — adicionar timeout de 15s
const res = await fetch(`${WORKER_BASE_URL}${path}`, {
  ...options,
  headers: { ... },
  signal: AbortSignal.timeout(15_000), // 15s timeout
})
```

**Critérios de Aceite:**
- [ ] workerFetch com timeout de 15s via AbortSignal.timeout
- [ ] Erro de timeout retorna `{ ok: false, error: 'Worker timeout' }` (não lança)
- [ ] Build sem erros

---

### T003 — Retry com Backoff para Worker Client
**Status:** ⏳ PENDENTE
**Tipo:** SEQUENTIAL (pós T002)
**Prioridade:** MÉDIA
**Arquivos:**
- criar: `src/lib/utils/retry.ts`
- modificar: `src/lib/worker-client.ts`

**Descrição:**
Chamadas ao worker Railway não têm retry. Falhas transientes (restart do container, cold start) resultam em erro imediato para o usuário. Adicionar retry com exponential backoff (max 3 tentativas) para métodos idempotentes (GET + trigger).

**Fix:**
```typescript
// src/lib/utils/retry.ts
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: { maxAttempts?: number; initialDelay?: number } = {}
): Promise<T> {
  const { maxAttempts = 3, initialDelay = 500 } = options
  let lastError: Error | undefined
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try { return await fn() } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      if (attempt < maxAttempts - 1) {
        await new Promise(r => setTimeout(r, initialDelay * Math.pow(2, attempt)))
      }
    }
  }
  throw lastError
}
```

**Critérios de Aceite:**
- [ ] `src/lib/utils/retry.ts` criado com exponential backoff
- [ ] `workerFetch` usa retry para triggerWorker e getWorkerStatus
- [ ] Build sem erros

---

### T004 — Logger Estruturado Centralizado
**Status:** ✅ COMPLETED
**Tipo:** SEQUENTIAL
**Prioridade:** MÉDIA
**Arquivos:**
- criar: `src/lib/logger.ts`
- modificar: arquivos com console.error em produção (críticos: `src/lib/worker-client.ts`, `src/lib/feature-flags.ts`, `src/lib/api-usage-tracker.ts`)

**Descrição:**
95 ocorrências de `console.log/error/warn` em código de produção. O projeto já tem `src/lib/log-sanitizer.ts` para sanitização e Sentry para erros críticos, mas não tem logger estruturado (JSON) compatível com Vercel/Railway. Criar `src/lib/logger.ts` encapsulando `console.*` com campos estruturados e substituir usos críticos.

**Evidências:**
- `src/lib/worker-client.ts:46` — console.error em erro de rede
- `src/lib/feature-flags.ts:106` — console.error em falha de PostHog
- `src/lib/api-usage-tracker.ts:36` — console.error em falha de alerta
- `src/lib/analytics-cache.ts:24` — console.error em Redis indisponível

**Fix (logger minimalista sem deps externas):**
```typescript
// src/lib/logger.ts
type Level = 'info' | 'warn' | 'error' | 'debug'

function log(level: Level, label: string, message: string, data?: object) {
  const entry = {
    level,
    label,
    message,
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
    ...(data || {}),
  }
  if (level === 'error') console.error(JSON.stringify(entry))
  else if (level === 'warn') console.warn(JSON.stringify(entry))
  else console.log(JSON.stringify(entry))
}

export const logger = {
  info: (label: string, message: string, data?: object) => log('info', label, message, data),
  warn: (label: string, message: string, data?: object) => log('warn', label, message, data),
  error: (label: string, message: string, data?: object) => log('error', label, message, data),
}
```

**Critérios de Aceite:**
- [ ] `src/lib/logger.ts` criado
- [ ] worker-client, feature-flags, api-usage-tracker, analytics-cache migrados
- [ ] Saída em JSON em produção (verificar via build)

---

### T005 — Cursor Pagination para Endpoints de Volume
**Status:** ⏳ PENDENTE
**Tipo:** PARALLEL-GROUP-1
**Prioridade:** BAIXA (sistema single-user, volume limitado)
**Arquivos:**
- modificar: `src/app/api/v1/knowledge/pains/route.ts`
- modificar: `src/app/api/v1/knowledge/objections/route.ts`
- modificar: `src/lib/services/image.service.ts`
- modificar: `src/app/api/v1/assets/route.ts`

**Descrição:**
4 endpoints usam `skip`/`offset` que degrada linearmente com o volume. Para o sistema single-user atual (< 10k registros por entidade), o impacto é desprezível. Registrar como débito técnico — migrar para cursor pagination se o sistema evoluir para multi-tenant.

**Evidências:**
- `src/app/api/v1/knowledge/pains/route.ts:21` — `skip: (page - 1) * limit`
- `src/app/api/v1/knowledge/objections/route.ts:17` — idem
- `src/lib/services/image.service.ts:21` — idem
- `src/app/api/v1/assets/route.ts:16` — idem

**Ação imediata:** Documentar como tech debt; não bloqueia produção.

**Critérios de Aceite:**
- [ ] Tech debt documentado em TECH-DEBT.md ou comentário inline
- [ ] Limite máximo de `limit` verificado (já tem `Math.min(100, ...)` em pains/route)

---

### T006 — Distributed Lock para Publishing Queue
**Status:** ✅ COMPLETED
**Tipo:** SEQUENTIAL
**Prioridade:** MÉDIA
**Arquivos:**
- criar: `src/lib/utils/distributed-lock.ts`
- modificar: `src/lib/services/publishing-queue.service.ts`

**Descrição:**
O publishing worker processa posts do Instagram. Se dois processos tentarem publicar o mesmo post simultaneamente (reinício do worker, retry automático), pode haver publicação duplicada — irreversível. Adicionar lock Redis antes de processar cada publicação.

**Evidências:**
- `src/lib/services/publishing-queue.service.ts` — sem lock distribuído
- `src/lib/audit/publish-audit.ts` — auditoria existe mas não previne duplicação

**Fix:**
```typescript
// src/lib/utils/distributed-lock.ts
export async function withLock<T>(
  redis: Redis,
  key: string,
  ttl: number,
  fn: () => Promise<T>
): Promise<T> {
  const lockKey = `lock:${key}`
  const lockValue = `${Date.now()}-${Math.random()}`
  const acquired = await redis.set(lockKey, lockValue, { nx: true, ex: ttl })
  if (!acquired) throw new Error(`Lock not acquired: ${key}`)
  try { return await fn() }
  finally { await redis.del(lockKey) }
}
```

**Critérios de Aceite:**
- [ ] `src/lib/utils/distributed-lock.ts` criado
- [ ] PublishingQueueService usa lock com TTL de 120s por postId
- [ ] Build sem erros

---

## Achados Fora de Escopo (Encaminhar)

| Achado | Arquivo | Comando |
|--------|---------|---------|
| Cache de dados (analytics, themes) sem SWR | `src/lib/cache-manager.ts` | `/nextjs:data-fetching` |
| Client hooks sem AbortController (useContentEditor) | `src/hooks/useContentEditor.ts` | `/nextjs:performance` |
| Variáveis de ambiente sem Zod em alguns lib files | `src/lib/worker-client.ts` | `/nextjs:configuration` |
| fs.readFileSync em image-pipeline (dev/build) | `src/lib/image-pipeline.ts:155` | N/A (build-time, aceitável) |
| localStorage em onboarding (não é estado de servidor) | `src/components/onboarding/OnboardingWizard.tsx` | `/nextjs:nextjs-components` |
