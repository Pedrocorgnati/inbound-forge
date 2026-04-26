# KEY-ROTATION — Runbook de Rotacao de Chaves

**Escopo:** Inbound Forge — providers externos cujas credenciais vivem em variaveis de ambiente.
**Owner:** Plataforma / Seguranca
**Ciclo recomendado:** **trimestral** + **imediato** em caso de vazamento suspeito, desligamento de colaborador com acesso, ou alerta Sentry/Supabase.

---

## 1. Principios

1. Toda chave rotacionada tem que ser testada antes de invalidar a anterior (sobreposicao segura).
2. Producao roda em **Vercel** (app + cron) e **Railway** (workers). Rotacionar em ambos.
3. Commits nao devem referenciar a chave nova nem antiga — apenas nomes de variavel.
4. Pos-rotacao sempre rodar smoke test (secao 5) antes de fechar o runbook.

---

## 2. Quando rotacionar

| Gatilho | Acao |
|---------|------|
| Trimestre fechado (mar / jun / set / dez) | Rotacionar todas as chaves de providers pagos |
| Vazamento em logs / repo / dump | Rotacionar **imediatamente** a chave afetada |
| Colaborador saiu com acesso ao dashboard | Rotacionar chaves que o colaborador podia ver |
| Sentry captura 401/403 em prod | Investigar e rotacionar se chave comprometida |
| Provider anuncia incidente | Seguir recomendacao do provider |

---

## 3. Procedimento por provider

### 3.1 Anthropic (Claude)

- **Variavel:** `ANTHROPIC_API_KEY`
- **Dashboard:** https://console.anthropic.com/settings/keys
- **Passos:**
  1. Criar nova key em **Create Key**, prefixo descritivo `inbound-forge-YYYYMM`.
  2. Vercel: `Settings > Environment Variables > ANTHROPIC_API_KEY` — atualizar valor em `Production` e `Preview`.
  3. Railway: `inbound-forge > Variables > ANTHROPIC_API_KEY` — atualizar.
  4. Redeploy: Vercel redeploy + Railway restart workers.
  5. Smoke: `curl -H "Authorization: Bearer $BEARER" https://app.inbound-forge.com/api/v1/credentials/test?provider=anthropic` — esperar `{ "ok": true }`.
  6. Apos confirmar, voltar ao dashboard e **revogar** a chave antiga.

### 3.2 Ideogram

- **Variavel:** `IDEOGRAM_API_KEY` (+ `IDEOGRAM_API_URL` se mudar endpoint)
- **Dashboard:** https://ideogram.ai/manage-api
- **Passos:** mesmos do Anthropic. Smoke: `?provider=ideogram`.

### 3.3 FAL (Flux)

- **Variavel:** `FAL_API_KEY` (ou `FAL_KEY`, `FAL_KEY_ID`, `FAL_KEY_SECRET` conforme integracao)
- **Dashboard:** https://fal.ai/dashboard/keys
- **Passos:** mesmos do Anthropic. Smoke: `?provider=flux`.

### 3.4 OpenAI (fallback LLM + traducao)

- **Variavel:** `OPENAI_API_KEY`
- **Dashboard:** https://platform.openai.com/api-keys
- **Passos:** mesmos do Anthropic. Smoke: `?provider=openai`.

### 3.5 Perplexity (fallback pesquisa)

- **Variavel:** `PERPLEXITY_API_KEY`
- **Dashboard:** https://www.perplexity.ai/settings/api
- **Passos:** mesmos do Anthropic. Smoke: `?provider=perplexity`.

### 3.6 Instagram Graph API

- **Variaveis:** `INSTAGRAM_APP_ID`, `INSTAGRAM_APP_SECRET`, `INSTAGRAM_USER_ACCESS_TOKEN`, `INSTAGRAM_BUSINESS_ACCOUNT_ID`
- **Dashboard:** https://developers.facebook.com/apps/
- **Passos:**
  1. Access tokens de longa duracao expiram em 60 dias — **rotacionar mensalmente** via `/oauth/access_token?grant_type=fb_exchange_token`.
  2. App Secret: so trocar se vazamento. Passos em `My Apps > Settings > Basic > App Secret`.
  3. Redeploy Vercel + Railway.
  4. Smoke: `?provider=instagram`.

### 3.7 Browserless (scraping)

- **Variaveis:** `BROWSERLESS_API_KEY`, `BROWSERLESS_URL`
- **Dashboard:** https://cloud.browserless.io/account
- **Passos:** mesmos do Anthropic. Smoke: `?provider=browserless`.

### 3.8 Supabase

- **Variaveis:** `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `DATABASE_URL`, `DIRECT_URL`
- **Dashboard:** https://app.supabase.com/project/_/settings/api (chaves) / `/settings/database` (passwords)
- **Passos:**
  1. `anon key` / `service_role`: regerar em `API > Reset JWT secret` (INVALIDA TODAS AS SESSOES — avisar operadores).
  2. DB password: `Database > Database password > Reset`.
  3. Atualizar `DATABASE_URL` e `DIRECT_URL` em Vercel + Railway.
  4. Redeploy e smoke test `/api/health`.

### 3.9 Upstash Redis

- **Variaveis:** `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- **Dashboard:** https://console.upstash.com
- **Passos:** `Database > REST API > Rotate token`. Mesmo fluxo de redeploy + smoke.

### 3.10 Google Analytics 4

- **Variaveis:** `GOOGLE_ANALYTICS_PROPERTY_ID`, `GOOGLE_SERVICE_ACCOUNT_KEY`, `GA4_API_SECRET`, `NEXT_PUBLIC_GA4_MEASUREMENT_ID`
- **Dashboard:**
  - Service Account: https://console.cloud.google.com/iam-admin/serviceaccounts
  - Measurement Protocol secret: GA4 > Admin > Data Streams > Measurement Protocol API secrets
- **Passos:**
  1. Service account key: `Keys > Add Key > JSON` -> substituir valor em env (inline JSON ou base64).
  2. `GA4_API_SECRET`: gerar novo em GA4, atualizar env, **revogar** antigo apos 24h.
  3. Smoke: `?provider=ga4`.

### 3.11 Sentry

- **Variaveis:** `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`
- **Dashboard:** https://sentry.io/settings/account/api/auth-tokens/ (token) / `Settings > Projects > {proj} > Client Keys (DSN)`
- **Passos:** DSN raramente precisa trocar. `SENTRY_AUTH_TOKEN` trocar se usado em CI; novo token com scope minimo (`project:releases`).

### 3.12 Resend

- **Variavel:** `RESEND_API_KEY`
- **Dashboard:** https://resend.com/api-keys
- **Passos:** criar nova key (scope `Sending access`), atualizar env, smoke `?provider=resend` dispara email para `ALERT_EMAIL_TO`.

### 3.13 Railway

- **Variavel:** `RAILWAY_API_TOKEN` (usada em GitHub Actions)
- **Dashboard:** https://railway.app/account/tokens
- **Passos:** gerar token com scope do projeto, atualizar GitHub Secret `RAILWAY_TOKEN`. Testar com re-run do workflow `deploy-railway.yml`.

### 3.14 PostHog

- **Variaveis:** `POSTHOG_API_KEY`, `POSTHOG_HOST`
- **Dashboard:** https://app.posthog.com/project/settings/api-keys
- **Passos:** gerar Project API key nova, atualizar env, smoke `?provider=posthog`.

### 3.15 Secrets internos (gerados com `openssl`)

| Variavel | Como gerar | Observacao |
|---------|-----------|------------|
| `PII_ENCRYPTION_KEY` | `openssl rand -base64 32` | **ROTACAO DESTRUTIVA** — re-encriptar coluna `Lead.pii_encrypted` antes de trocar |
| `WORKER_AUTH_TOKEN` | `openssl rand -base64 32` | Atualizar Vercel + Railway simultaneamente |
| `WORKER_AUTH_SECRET` | `openssl rand -base64 32` | Idem |
| `INTERNAL_HEALTH_SECRET` | `openssl rand -base64 32` | |
| `CRON_SECRET` | `openssl rand -base64 32` | Atualizar tambem em Vercel Cron config |
| `CSRF_SECRET` | `openssl rand -base64 32` | Invalida tokens CSRF ativos — usuarios reenviam forms |
| `BLOG_PREVIEW_SECRET` | `openssl rand -base64 32` | Atualizar link de preview para editores |
| `KB_EXPORT_SECRET` | `openssl rand -base64 32` | |

---

## 4. Checklist pos-rotacao

- [ ] Valor atualizado em **Vercel** (Production + Preview)
- [ ] Valor atualizado em **Railway** (producao)
- [ ] Valor atualizado em **GitHub Secrets** (se usado em CI)
- [ ] Redeploy Vercel + Railway restart
- [ ] Smoke `/api/v1/credentials/test?provider={X}` retorna `{ ok: true }`
- [ ] Chave antiga **revogada** no dashboard do provider
- [ ] Entrada registrada em `docs/ROTATION-LOG.md` (data, provider, operador)
- [ ] Alerta Sentry/uptime verde por 30min pos-rotacao

---

## 5. Smoke test generico

```bash
BEARER="$INTERNAL_HEALTH_SECRET"
for p in anthropic ideogram flux openai perplexity instagram browserless supabase upstash ga4 resend posthog; do
  echo -n "$p: "
  curl -s -H "Authorization: Bearer $BEARER" \
    "https://app.inbound-forge.com/api/v1/credentials/test?provider=$p" | jq -r '.ok'
done
```

Se `ok=false` em qualquer provider, reabrir o runbook e investigar antes de fechar.

---

## 6. Rollback

1. Manter a chave antiga ativa por **ate 1h** apos rotacao para poder reverter.
2. Se smoke falha: restaurar valor antigo em Vercel/Railway (redeploy), **nao revogar** no dashboard.
3. Abrir incidente (Sentry / canal ops), investigar, repetir rotacao apos fix.
4. Apos 1h sem incidentes, revogar a chave antiga definitivamente.

---

## 7. Referencias

- `.env.example` — lista canonica de variaveis
- `docs/DEPLOY-RUNBOOK.md` — procedimento de deploy
- `docs/ROTATION-LOG.md` — historico de rotacoes (append-only)
