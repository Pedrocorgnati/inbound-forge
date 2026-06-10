# Runbook — Inbound Forge
<!-- CL-299 (TASK-9 ST002) — Playbook de incidentes operacionais -->

> **Owner:** plataforma / DevOps
> **Atualizado:** 2026-05-15
> **Health publico:** `GET /api/health/public`

---

## 1. Onboarding Oncall

Antes de assumir o turno:
1. Verificar [status Vercel](https://vercel.com/status) e [status Supabase](https://status.supabase.com/)
2. Checar Sentry para novos erros nas ultimas 2h
3. Executar `curl https://{DOMAIN}/api/health/public` — deve retornar `{"status":"ok",...}`
4. Verificar Railway para workers (reconciliation, lgpd-export) em estado RUNNING

---

## 2. Health Checks

| Servico | URL / Comando | Esperado |
|---------|---------------|---------|
| App (publico) | `GET /api/health/public` | `{"status":"ok"}` 200 |
| App (detalhado, auth) | `GET /api/health` | `{"status":"ok","db":true,"redis":true}` |
| Workers | Railway dashboard → workers | Status: running |
| DB | Supabase Dashboard → Database | Connection pool < 80% |
| Redis | Upstash console → `PING` | PONG |
| Sentry | sentry.io → Issues | Sem novos alerts criticos |

---

## 3. Cenarios de Incidente

### 3.1 Deploy quebrado em prod

**Sintoma:** 500 na homepage, `/api/health/public` retorna degraded ou connection timeout.

**Diagnostico:**
```bash
vercel list                     # ver deploys recentes
vercel inspect {DEPLOYMENT_ID}  # ver logs do build
```

**Rollback:**
```bash
vercel rollback {DEPLOYMENT_ID}
```

**Pos-rollback:** verificar `/api/health/public` e avisar equipe.

---

### 3.2 DB down / connection pool exausto

**Sintoma:** `prisma.connect` timeout, health retorna `"db":false`.

**Diagnostico:**
```sql
-- Supabase SQL Editor
SELECT count(*), state FROM pg_stat_activity GROUP BY state;
```

**Remedios:**
1. Se pool exausto: escalar workers Railway, aguardar 2min para auto-release
2. Se DB down: aguardar SLA Supabase ou fazer failover (ver `docs/DEPLOY-RUNBOOK.md`)
3. Reiniciar workers Railway se conexoes orphaned: Railway → Worker → Restart

---

### 3.3 Worker stuck (WorkerHealth falha)

**Sintoma:** `/api/worker-health` retorna workers em estado ERROR ou STUCK.

**Diagnostico:**
```bash
# Railway logs do worker especifico
railway logs --service {WORKER_NAME} --tail 100
```

**Remedios:**
1. Railway → Restart service
2. Se DLQ acumulando: acessar `/admin/health/jobs` → DLQ Reprocess
3. Se Redis down: workers param automaticamente, ver cenario 3.5

---

### 3.4 Quota de provider de IA excedida

**Sintoma:** imagens/videos parados, QuotaBadge vermelho no dashboard admin.

**Diagnostico:** `/api/admin/quotas` ou verificar logs Sentry com tag `quota_exceeded`.

**Remedios:**
1. Aumentar limite no painel do provider (Ideogram, Flux, etc.)
2. Ou ativar provider alternativo via env `BACKUP_IMAGE_PROVIDER=flux`
3. Jobs na fila continuarao automaticamente apos quota restaurada

---

### 3.5 Reconciliacao com divergencia alta

**Sintoma:** badge de reconciliacao vermelho, `postsWithoutConversion` alto.

**Diagnostico:**
```
GET /api/v1/analytics/reconciliation
```

**Remedios:**
1. Verificar se UTM tracking esta ativo para posts recentes
2. Executar `POST /api/admin/reconciliation/trigger` para forcear reconciliacao manual
3. Se divergencia > 20%: escalar para engineering

---

### 3.6 Sentry sem captura de erros

**Sintoma:** erros em producao nao aparecem no Sentry.

**Diagnostico:**
1. Verificar `SENTRY_DSN` em Vercel env vars
2. Testar: `GET /api/_debug/sentry-test` (retorna erro de teste se Sentry ativo)
3. Verificar `src/lib/sentry.ts` — `withSentryConfig` deve estar ativo em prod

**Remedios:**
1. Re-setar `SENTRY_DSN` e redeploy
2. Verificar `sentry.client.config.ts` e `sentry.server.config.ts`

---

### 3.7 Auth Supabase down

**Sintoma:** login quebrado, sessoes expiradas, `/api/auth/session` retorna 401.

**Diagnostico:** verificar [status.supabase.com](https://status.supabase.com/).

**Remedios:**
1. Se Supabase parcial: aguardar, nao ha fallback local
2. Notificar usuarios via status page externa
3. Pos-recovery: sessoes sao restauradas automaticamente via `useSessionRefresh`

---

## 4. Comandos Uteis

```bash
# Rotacao de NEXTAUTH_SECRET (requer logout de todos os usuarios)
vercel env rm NEXTAUTH_SECRET production
vercel env add NEXTAUTH_SECRET production
vercel deploy --prod

# Rebuild de cache Redis
curl -X POST /api/admin/cache/flush -H "Authorization: Bearer {ADMIN_TOKEN}"

# Forcar re-scraping de uma fonte
curl -X POST /api/admin/scraping/replay -H "..." -d '{"sourceId":"..."}'

# Status dos workers
curl /api/worker-health
```

---

## 5. Escalation Matrix

| Severidade | Criterio | Acao |
|------------|----------|------|
| P0 | App inacessivel ou DB down | Acordar lead tech imediatamente |
| P1 | Worker stuck > 30min ou Sentry mudo | Notificar no Slack #incidents |
| P2 | Quota excedida ou reconciliacao alta | Ticket para proximo dia util |
| P3 | Logs de aviso, nenhum impacto usuario | Monitoring ticket |

---

## 6. Template Post-Mortem

```markdown
# Post-Mortem — {TITULO} — {DATA}

## Resumo
{1 paragrafo}

## Timeline
- HH:MM — Primeiro alerta
- HH:MM — Diagnostico confirmado
- HH:MM — Mitigacao aplicada
- HH:MM — Incidente resolvido

## Root Cause
{analise tecnica}

## Impacto
- Duracao: {X}h
- Usuarios afetados: {N}
- Features impactadas: {lista}

## Acoes corretivas
- [ ] {acao 1} — owner: {nome} — prazo: {data}
- [ ] {acao 2}

## Licoes aprendidas
{resumo}
```
