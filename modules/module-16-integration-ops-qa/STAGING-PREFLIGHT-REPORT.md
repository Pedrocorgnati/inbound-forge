# STAGING PRE-FLIGHT REPORT

**Data:** 2026-04-27
**Task:** TASK-12 — Staging Pre-Flight
**Ambiente:** A validar (staging URL pendente de deploy)
**Executado por:** delivery-pre milestone-15

---

## Status Global

> **PENDENTE** — Este relatório serve como template estruturado para ser preenchido
> quando o ambiente de staging estiver disponível. Os itens abaixo refletem o
> inventário completo que deve ser validado antes de executar TASK-2 (E2E) e TASK-3
> (API Contract Testing).

---

## ST001 — Env Vars

| Variável | Criticidade | Status |
|----------|-------------|--------|
| DATABASE_URL | CRITICA | A validar |
| DIRECT_URL | CRITICA | A validar |
| NEXT_PUBLIC_SUPABASE_URL | CRITICA | A validar |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | CRITICA | A validar |
| SUPABASE_SERVICE_ROLE_KEY | CRITICA | A validar |
| UPSTASH_REDIS_REST_URL | CRITICA | A validar |
| UPSTASH_REDIS_REST_TOKEN | CRITICA | A validar |
| ANTHROPIC_API_KEY | CRITICA | A validar |
| SENTRY_DSN | CRITICA | A validar |
| RESEND_API_KEY | CRITICA | A validar |
| WORKER_AUTH_TOKEN | CRITICA | A validar |
| WORKER_AUTH_SECRET | CRITICA | A validar |
| INTERNAL_HEALTH_SECRET | CRITICA | A validar |
| PII_ENCRYPTION_KEY | CRITICA | A validar |
| NEXTAUTH_SECRET | CRITICA | A validar |
| IDEOGRAM_API_KEY | MEDIA | A validar |
| FAL_API_KEY | MEDIA | A validar |
| INSTAGRAM_USER_ACCESS_TOKEN | MEDIA | A validar |
| INSTAGRAM_BUSINESS_ACCOUNT_ID | MEDIA | A validar |
| POSTHOG_API_KEY | BAIXA | A validar |
| GA4_API_SECRET | BAIXA | A validar |
| RAILWAY_API_TOKEN | BAIXA | A validar |

**Resultado ST001:** A validar
**Vars críticas faltando:** Desconhecido

---

## ST002 — Serviços Externos

| Serviço | Teste | Status |
|---------|-------|--------|
| Supabase PostgreSQL | `SELECT 1` via Prisma | A validar |
| Supabase Auth | Criar usuário de teste | A validar |
| Redis Upstash | `PING` via REST | A validar |
| Railway Worker Scraping | GET /health no worker | A validar |
| Railway Worker Image | GET /health no worker | A validar |
| Resend API | Enviar email de teste | A validar |
| Sentry | Enviar evento de teste | A validar |

**Resultado ST002:** A validar

---

## ST003 — Seed de Dados

| Entidade | Mínimo | Status |
|----------|--------|--------|
| Operador (usuário admin) | 1 | A validar |
| Cases (knowledge base) | 5 | A validar |
| Pains | 5 | A validar |
| Patterns | 5 | A validar |
| Objections | 5 | A validar |
| Themes com conversionScore | 10 | A validar |
| ContentPieces com status APPROVED | 3 | A validar |
| Posts agendados com scheduledAt e trackingUrl | 1 | A validar |
| Assets na biblioteca | 5 | A validar |
| Leads com conversion events | 2 | A validar |

**Seed command:** `npx prisma db seed` (ou `npm run db:seed:staging`)
**Resultado ST003:** A validar

---

## ST004 — Build de Staging

| Verificação | Status |
|-------------|--------|
| Último deploy Vercel sem erro | A validar |
| URL de staging retorna HTTP 200 | A validar |
| Página de login carrega | A validar |
| Login com credenciais do seed funciona | A validar |
| Middleware guard redireciona para /onboarding | A validar |

**URL de staging:** [configurar em Vercel Preview / staging branch]
**Resultado ST004:** A validar

---

## Procedimento de Execução

```bash
# 1. Verificar env vars no Vercel (staging environment)
vercel env ls --environment=preview

# 2. Verificar conectividade de serviços
curl -X POST https://your-staging-url.vercel.app/api/v1/health/internal \
  -H "x-internal-secret: $INTERNAL_HEALTH_SECRET"

# 3. Executar seed no banco de staging
DATABASE_URL="$STAGING_DATABASE_URL" npx prisma db seed

# 4. Smoke test de login
curl -X POST https://your-staging-url.vercel.app/api/v1/auth/session \
  -H "Content-Type: application/json" \
  -d '{"email":"test@staging.local","password":"staging-test-pass"}'
```

---

## Critério de Liberação

Antes de iniciar TASK-2 (E2E) e TASK-3 (API Contract):
- [ ] 0 vars críticas faltando (ST001)
- [ ] Supabase + Redis + Railway workers com status OK (ST002)
- [ ] Seed executado com contagens mínimas (ST003)
- [ ] Build de staging acessível + login funcional (ST004)

**Veredito:** PENDENTE — preencher após deploy de staging

---

*Gerado por: delivery-pre milestone-15 — 2026-04-27*
*Template para preenchimento quando ambiente de staging estiver disponível*
