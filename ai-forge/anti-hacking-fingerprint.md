# Anti-Hacking Fingerprint
Data: 2026-04-05
Projeto: Inbound Forge

## Stack

| Componente | Versão instalada | Declarado em package.json |
|------------|-----------------|--------------------------|
| Next.js | 14.2.35 | ^14.2.21 |
| React | 18.3.1 | ^18.3.1 |
| Node.js | - (Vercel managed) | - |
| TypeScript | 5.x | ^5.7.3 |

## Arquitetura

- **Router**: App Router (`src/app/`) — Pages Router NÃO usado
- **Auth**: Supabase SSR (`@supabase/ssr` ^0.5.2) + `supabase.auth.getUser()` (server-side)
- **ORM**: Prisma 6.x + PostgreSQL + Supabase
- **Deploy**: Vercel (configurado em project.json)
- **Middleware**: `src/middleware.ts` — auth + CSP com nonce + locale redirect
- **Server Actions**: 4 arquivos em `src/actions/` (`knowledge.ts`, `leads.ts`, `dashboard.ts`, `analytics.ts`)
- **API Routes**: ~100+ rotas em `src/app/api/`
- **Rate Limiting**: Upstash Redis (`@upstash/ratelimit`)
- **Observabilidade**: Sentry 10.x (`@sentry/nextjs`)
- **Pagamentos**: NÃO (app SaaS B2B sem pagamentos diretos)

## Dependências relevantes de segurança

- `isomorphic-dompurify` — sanitização XSS (usado em JsonLdScript)
- `zod` — validação de entrada
- `@upstash/ratelimit` — rate limiting Redis
- `crypto` nativo — nonce CSP e timingSafeEqual

## Configuração de segurança observada

- CSP dinâmico com nonce por request ✅
- HSTS em produção ✅
- X-Frame-Options: DENY ✅
- X-Content-Type-Options: nosniff ✅
- Referrer-Policy: strict-origin-when-cross-origin ✅
- Source maps ocultos (Sentry `hideSourceMaps: true`) ✅
- `poweredByHeader: false` ❌ NÃO configurado
- Open redirect protection via `validateCallbackUrl()` ✅
- Worker token com `timingSafeEqual` ✅
- PII criptografado em `leads.contactInfo` ✅
- Audit log para operações de lead ✅

## Middleware — matcher

```
/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)
```

Paths públicos declarados: `/login`, `/blog`, `/api/health`, `/api/v1/health`, `/api/auth`

**Observação**: `/api/auth/increment-attempts` e `/api/auth/check-lock` estão sob `/api/auth` e portanto são públicos por definição no middleware — mas carecem de proteções adicionais.
