# CSRF Protection

**Versao:** v1
**Data:** 2026-04-18
**Origem:** TASK-1 (CL-272 / CL-275)

## Resumo

Toda rota mutativa em `/api/v1/*` exige header `x-csrf-token` valido + cookie `x-csrf-token` (double-submit). Token e HMAC-SHA256 sobre `sessionId.timestamp` com `CSRF_SECRET`. TTL: 24h.

## Endpoint

`GET /api/v1/csrf` — autenticado, devolve `{ token, expiresInSec }` e seta cookie SameSite=Lax. Status 401 `SESSION_REQUIRED` se anonimo.

## Middleware

`src/middleware.ts` intercepta `POST/PUT/DELETE/PATCH` em `/api/*`. Whitelist:
- `/api/v1/csrf` (minting)
- `/api/v1/auth/*`, `/api/auth/*` (login/logout)
- `/api/webhooks/*` (terceiros assinam payload, nao usam sessao)

Em falha responde `403 { code: "CSRF_TOKEN_MISSING" | "CSRF_TOKEN_INVALID" }`.

## Client

`src/lib/api-client.ts` injeta header automaticamente em metodos mutativos. Em `403 CSRF_TOKEN_INVALID`, limpa cache, refaz `GET /api/v1/csrf` e retenta uma vez. Hook `useCsrfToken` cacheia em `sessionStorage` por 23h.

## Variaveis de ambiente

- `CSRF_SECRET` — string >= 32 chars, randomico, somente backend.

## Secrets scan (gitleaks)

`.github/workflows/secret-scan.yml` roda em push, PR e schedule semanal. Config em `.gitleaks.toml` com regra custom para `SUPABASE_SERVICE_ROLE_KEY`.

## Excecoes

- Webhooks externos (Stripe, Meta, Instagram) usam HMAC do provedor, nao CSRF.
- Endpoints de health (`/api/health`, `/api/v1/health`) sao GET publicos.

## Referencias

- ERROR-CATALOG: `CSRF_TOKEN_MISSING`, `CSRF_TOKEN_INVALID`, `SESSION_REQUIRED`
- HLD secao SEC-003 (auth)
- LLD secao auth/middleware
