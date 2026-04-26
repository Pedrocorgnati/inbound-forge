# DEPLOY-RUNBOOK — Inbound Forge

**Escopo:** deploy da Next.js (Vercel) + workers (Railway) + cron (Vercel Cron).
**Owner:** Plataforma / DevOps

---

## 1. Vercel (Next.js + API)

- **Trigger:** push em `main` dispara deploy automatico via Vercel Git integration.
- **Env vars:** configurar em Project Settings > Environment Variables. Referencia: `.env.example` + `docs/KEY-ROTATION.md`.
- **Cron jobs** (ver `vercel.json`):
  - `/api/cron/worker-silence-check` — a cada 5min, detecta worker silencioso.
  - `/api/cron/ga4-sync` — diario 03:00 UTC, reconciliacao de clicks vs conversoes (Intake-Review TASK-7 / CL-103/104).
  - Ambos protegidos por header `Authorization: Bearer ${CRON_SECRET}`.

---

## 2. Railway (Workers)

Workers: `scraping-worker`, `image-worker`, `video-worker`, `publishing-worker`.

### 2.1 Deploy automatizado (Intake-Review TASK-7 / CL-344)

GitHub Actions `.github/workflows/deploy-railway.yml` dispara em push para `main` quando `workers/**` ou `src/workers/**` mudam.

Secrets necessarios no GitHub:
- `RAILWAY_TOKEN` — token do projeto Railway.

### 2.2 Deploy manual (fallback)

```bash
cd workers/image-worker
railway up --service inbound-forge-image-worker
```

### 2.3 Env vars por worker

Ver `workers/railway.toml`. Minimo comum:
- `DATABASE_URL`, `REDIS_URL`, `WORKER_TOKEN`, `NODE_ENV=production`, `LOG_LEVEL=info`
- `RESEND_API_KEY`, `ALERT_EMAIL_TO` — para alertas via `sendAlertEmail`.

---

## 3. Alertas por email (Intake-Review TASK-7 / CL-183)

- `src/lib/alert-email.ts` chama Resend REST API.
- Disparado por `sla-monitor.ts`, `worker-silence-detector.service.ts` em falhas consecutivas.
- **Smoke test:**
  ```bash
  RESEND_API_KEY=... ALERT_EMAIL_TO=ops@example.com pnpm tsx scripts/smoke-email.ts
  ```
  Se email chegar, setup esta OK.

---

## 4. Rollback

| Alvo | Como reverter |
|------|---------------|
| Vercel | Dashboard > Deployments > Promote previous |
| Railway | `railway rollback --service <service-name>` |
| Prisma migration | `prisma migrate resolve --rolled-back <name>` + migration inversa |

---

## 5. Verificacao pos-deploy

1. `GET /api/health` -> 200
2. `GET /pt-BR/blog` -> lista artigos
3. Railway: `/health` de cada worker -> 200
4. Executar cron manualmente:
   ```bash
   curl -H "Authorization: Bearer $CRON_SECRET" https://app.inboundforge.com/api/cron/ga4-sync
   ```
5. Ver Resend dashboard por emails recebidos nas ultimas 24h.
