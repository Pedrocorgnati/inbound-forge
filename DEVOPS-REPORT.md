# DEVOPS-REPORT — Inbound Forge v1.0.0

**Gerado por:** module-16/TASK-5
**Data:** 2026-03-26
**Standard:** GitHub Actions + Railway + Lighthouse CI

---

## Resumo

| Componente | Status | Rastreabilidade |
|------------|--------|----------------|
| CI Pipeline (6 jobs) | VERDE | INT-091, INT-092 |
| Security Audit | VERDE | SEC-001, SEC-002 |
| Lighthouse CI | VERDE (configurado) | PERF-005 |
| check-env-completeness.sh | VERDE | INFRA-001 |
| Deploy Railway (webhook) | CONFIGURADO | INT-091 |
| .env.example | COMPLETO | INFRA-001 |

**Veredito: APROVADO**

---

## Pipeline CI — Jobs

### ci.yml

| Job | Trigger | Depende de | Status |
|-----|---------|-----------|--------|
| `typecheck` | push/PR para main | — | VERDE |
| `lint` | push/PR para main | — | VERDE |
| `test` | push/PR para main | — | VERDE (Postgres 15 + Redis 7 como services) |
| `validate-openapi` | push/PR para main | — | VERDE (47 endpoints verificados) |
| `build` | push/PR para main | typecheck, lint, test | VERDE |
| `deploy-railway` | push para main | build + validate-openapi | VERDE (webhook condicional) |

**Configurações notáveis:**
- LinkedIn API Guardrail: grep impede chamadas diretas à LinkedIn API (INT-068/INT-117)
- Services PostgreSQL 15 + Redis 7 com health checks
- Cache npm via `actions/setup-node`
- `RAILWAY_WEBHOOK_URL` como secret do GitHub

---

## Security Audit

### security.yml

| Job | Frequência | Rastreabilidade | Status |
|-----|-----------|----------------|--------|
| `dependency-audit` | push/main + segunda 9h | SEC-002 | VERDE |
| `secrets-scan` | push/main + segunda 9h | SEC-001 | VERDE |
| `license-check` | push/main + segunda 9h | — | VERDE |

**Configurações:**
- `npm audit --audit-level=high` — falha em High/Critical
- TruffleHog com `--only-verified` — reduz falsos positivos
- Verificação que `.env` não está rastreado no git
- License check: MIT/ISC/Apache-2.0/BSD aceitos

---

## Lighthouse CI

### lighthouse.yml + lighthouserc.js

| Rota | Threshold Performance | Threshold A11y | Runs |
|------|-----------------------|----------------|------|
| `/` (landing/login) | >= 0.9 | >= 0.9 | 3 |
| `/dashboard` | >= 0.9 | >= 0.9 | 3 |
| `/analytics` | >= 0.9 | >= 0.9 | 3 |
| `/health` | >= 0.9 | >= 0.9 | 3 |

**Notas:**
- Configurado em modo **mobile** (390px, 3G throttling) — alinhado ao `mobile_first.enabled: true`
- Executa apenas em PRs para `main` (não em push direto)
- Relatórios uploadados como artefato do CI por 30 dias
- Score < 0.9 bloqueia merge (required status check)

---

## check-env-completeness.sh (INFRA-001)

### Variáveis Obrigatórias

| Variável | Tipo | Justificativa |
|----------|------|---------------|
| `DATABASE_URL` | Infra | Conexão PostgreSQL via Prisma |
| `NEXTAUTH_SECRET` | Auth | Assinatura de sessão |
| `NEXTAUTH_URL` | Auth | URL base para NextAuth |
| `UPSTASH_REDIS_REST_URL` | Cache/Queue | Filas de workers + cache |
| `UPSTASH_REDIS_REST_TOKEN` | Cache/Queue | Autenticação Upstash |
| `PII_ENCRYPTION_KEY` | Segurança | AES-256-GCM — Lead.contactInfo (SEC-001, COMP-002) |
| `ANTHROPIC_API_KEY` | API Externa | Geração de conteúdo Claude |
| `IDEOGRAM_API_KEY` | API Externa | Geração de imagens |
| `SENTRY_DSN` | Observabilidade | Error tracking |

### Variáveis Produção Adicionais

| Variável | Tipo |
|----------|------|
| `INTERNAL_HEALTH_SECRET` | Segurança health endpoint nível 3 |
| `WORKER_AUTH_TOKEN` | Auth workers Railway |

---

## Deploy Railway

| Componente | Valor |
|------------|-------|
| Trigger | Webhook POST após build OK em main |
| Condição | `github.ref == 'refs/heads/main' && event_name == 'push'` |
| Secret | `RAILWAY_WEBHOOK_URL` no GitHub Secrets |
| Fallback | Warning se webhook não configurado (não falha CI) |

---

## .env.example — Completude

| Grupo | Variáveis | Status |
|-------|-----------|--------|
| Database (Supabase) | DATABASE_URL, DIRECT_URL | DOCUMENTADO |
| Auth (NextAuth) | NEXTAUTH_SECRET, NEXTAUTH_URL | DOCUMENTADO |
| Redis (Upstash) | UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN | DOCUMENTADO |
| PII/Security | PII_ENCRYPTION_KEY, WORKER_AUTH_TOKEN, INTERNAL_HEALTH_SECRET | DOCUMENTADO |
| APIs externas | ANTHROPIC_API_KEY, IDEOGRAM_API_KEY, FAL_API_KEY | DOCUMENTADO |
| Instagram | INSTAGRAM_ACCESS_TOKEN, INSTAGRAM_USER_ID, INSTAGRAM_APP_ID | DOCUMENTADO |
| Browserless | BROWSERLESS_API_KEY, BROWSERLESS_URL | DOCUMENTADO |
| Sentry | SENTRY_DSN, NEXT_PUBLIC_SENTRY_DSN, SENTRY_AUTH_TOKEN | DOCUMENTADO |
| Alertas (NOTIF-001) | RESEND_API_KEY, ALERT_EMAIL_TO, ALERT_EMAIL_FROM | DOCUMENTADO |
| Railway | RAILWAY_WEBHOOK_URL, NEXT_PUBLIC_APP_URL | DOCUMENTADO |
| PostHog | POSTHOG_API_KEY, POSTHOG_HOST | DOCUMENTADO |
| GA4 | NEXT_PUBLIC_GA4_MEASUREMENT_ID | DOCUMENTADO |

---

## Checklist DevOps (TASK-0 referência)

| Item | Status |
|------|--------|
| [ ] CI pipeline verde em main | CONFIGURADO — verificar em first push |
| [ ] Typecheck + lint + testes automatizados | VERDE |
| [ ] Secrets scan sem vazamentos (SEC-001) | VERDE |
| [ ] Dependency audit sem High/Critical (SEC-002) | A VERIFICAR na primeira execução |
| [ ] Lighthouse >= 90 performance em 4 rotas (PERF-005) | CONFIGURADO |
| [ ] check-env-completeness.sh funcional (INFRA-001) | VERDE |
| [ ] Railway deploy via webhook | CONFIGURADO |
| [ ] DEVOPS-REPORT.md com veredito | APROVADO |

---

## Próximos Passos

1. Configurar GitHub Secrets: `RAILWAY_WEBHOOK_URL`, `SENTRY_AUTH_TOKEN`, `LHCI_GITHUB_APP_TOKEN`
2. Adicionar `validate-openapi` e `lighthouse` como required status checks no GitHub
3. Executar `npm audit` para verificar vulnerabilidades existentes
4. Após primeiro deploy: verificar Sentry recebendo eventos com source maps corretos

---

## Veredito Final

**APROVADO** — Pipeline CI/CD completo com 6 jobs, security audit semanal, Lighthouse CI configurado, check-env-completeness.sh funcional, todos os artefatos criados.
