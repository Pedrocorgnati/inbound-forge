# Anti-Hacking Tasks
Data: 2026-04-05
Projeto: Inbound Forge

---

## P1-CRITICO (Fix em 24h — antes de qualquer release em produção)

### T001 — Rate limit em /api/auth/increment-attempts
**CVE/Ref**: OWASP A07 — Account Lockout DoS  
**Arquivo**: `src/app/api/auth/increment-attempts/route.ts`  
**Linha**: 1–30 (arquivo inteiro)

**⚠️ Revisão Codex**: O uso de `x-forwarded-for` é spoofável — atacante pode enviar headers distintos para bypassar o rate limit. **Usar `request.ip` no Vercel (injetado pela edge infra, não spoofável) ou combinar com identifier como chave secundária.**

**Problema**: Endpoint público sem rate limiting permite que qualquer atacante bloqueie qualquer conta com script simples.

**Fix corrigido (Vercel-safe, não-spoofável)**:
```typescript
// src/app/api/auth/increment-attempts/route.ts
import { type NextRequest, NextResponse } from 'next/server'
import { incrementLoginAttempts, lockAccount } from '@/lib/auth/rate-limit'
import { BUSINESS_RULES } from '@/types/constants'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, '1m'),
  prefix: 'increment-attempts',
})

export async function POST(request: NextRequest) {
  let body: { identifier?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ attempts: 0 }, { status: 400 })
  }

  const { identifier } = body
  if (!identifier || typeof identifier !== 'string') {
    return NextResponse.json({ attempts: 0 }, { status: 400 })
  }

  // Rate limit por identifier (email) — não por IP (spoofável no Vercel)
  // Chave = "increment:{email}" garante que mesmo com IPs rotativos o lock é por conta
  // O IP do Vercel (request.ip) pode ser adicionado como camada adicional se necessário
  const { success } = await ratelimit.limit(`increment:${identifier}`)
  if (!success) {
    return NextResponse.json({ attempts: 0 }, { status: 429 })
  }

  try {
    const attempts = await incrementLoginAttempts(identifier)
    if (attempts >= BUSINESS_RULES.MAX_LOGIN_ATTEMPTS) {
      await lockAccount(identifier, attempts)
    }
    return NextResponse.json({ attempts })
  } catch {
    return NextResponse.json({ attempts: 0 })
  }
}
```

**Teste de validação**:
1. Chamar endpoint 6x do mesmo IP em < 1 minuto → deve retornar 429 na 6ª
2. Aguardar 1 min → deve aceitar novamente
3. Verificar que conta NUNCA é bloqueada via esse endpoint sozinho

**Estimativa**: 30 minutos

---

## P2-ALTO (Fix no próximo sprint — antes de produção em escala)

### T002 — Adicionar auth em Server Actions dashboard.ts
**Arquivo**: `src/actions/dashboard.ts`  
**Linha**: 5–22 (todas as funções)

**Problema**: 3 Server Actions sem `checkSession()`. Quando implementadas, serão acessíveis sem autenticação.

**Fix**: Adicionar guard de sessão em todas as funções antes de qualquer lógica de negócio:
```typescript
'use server'
import { createClient } from '@/lib/supabase-server'
import { captureException } from '@/lib/sentry'

async function requireAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autorizado')
  return user
}

export async function getDashboardStats() {
  try {
    await requireAuth()
    // TODO: Implementar backend
    return { totalArticles: 0, publishedThisMonth: 0, activeLeads: 0, monthlyCost: 0 }
  } catch (err) {
    if (err instanceof Error && err.message === 'Não autorizado') {
      return { error: 'Não autorizado' }
    }
    captureException(err, { action: 'getDashboardStats' })
    return { error: 'Falha' }
  }
}

// Repetir padrão para getRecentActivity e getPipelineProgress
```

**Estimativa**: 20 minutos

---

### T003 — Especificar hostname Supabase exato em remotePatterns
**Arquivo**: `next.config.mjs:39`

**Problema**: `hostname: '**.supabase.co'` permite SSRF via Image Optimizer para qualquer projeto Supabase.

**Fix**:
```javascript
// next.config.mjs
images: {
  remotePatterns: [
    {
      protocol: 'https',
      hostname: process.env.SUPABASE_HOSTNAME ?? 'your-project.supabase.co',
      // Ou hardcode o hostname de produção específico
    },
  ],
},
```

Adicionar `SUPABASE_HOSTNAME` nas variáveis de ambiente (ex: `xyzabc.supabase.co`).

**Estimativa**: 15 minutos

---

### T004 — Desabilitar X-Powered-By
**Arquivo**: `next.config.mjs`

**Fix**:
```javascript
const nextConfig = {
  poweredByHeader: false, // ← adicionar linha
  output: 'standalone',
  // ...
}
```

**Estimativa**: 5 minutos

---

## P3-MEDIO (Próximo sprint)

### T005 — Rate limit em /api/auth/check-lock (enumeração de emails)
**Arquivo**: `src/app/api/auth/check-lock/route.ts`

**Fix**: Adicionar rate limiting por IP (5 req/min). Usar o mesmo Ratelimit do Upstash já configurado no projeto.

**Estimativa**: 20 minutos

---

### T006 — Rate limit em /api/log-error (log flooding Sentry)
**Arquivo**: `src/app/api/log-error/route.ts`

**Fix**: Adicionar rate limiting por IP (10 req/min).

**Estimativa**: 15 minutos

---

### T007 — Upgrade Next.js para mitigar GHSA-9g9p, GHSA-h25m, GHSA-ggv3
**Impacto**: 4 vulnerabilidades high resolvidas

**Ação**: Avaliar upgrade para Next.js 15.x (breaking changes menores) ou 16.x.
- `npm install next@15` — testar compatibilidade com next-intl, Sentry, next-themes
- Rodar `npm run build && npm run test` para validar

**Estimativa**: 2–4h (teste de regressão incluído)

---

### T008 — Validação de formato GA4_ID antes de interpolação
**Arquivo**: `src/components/analytics/GA4Script.tsx:32`

**Fix**:
```typescript
const GA4_ID = process.env.NEXT_PUBLIC_GA4_ID
// Guardar contra supply chain: validar formato antes de usar em HTML
const isValidGA4ID = GA4_ID && /^G-[A-Z0-9]{6,12}$/.test(GA4_ID)
if (!isValidGA4ID) return null
```

**Estimativa**: 15 minutos

---

## P4-BAIXO (Backlog)

### T009 — Substituir Math.random() por randomBytes em filename geração
**Arquivo**: `src/lib/services/visual-asset.service.ts:33`

**Fix**:
```typescript
import { randomBytes } from 'crypto'

function generateFileName(originalName: string): string {
  const ext = originalName.split('.').pop()?.toLowerCase() ?? 'bin'
  const base = `${Date.now()}-${randomBytes(6).toString('hex')}`
  return `${base}.${ext}`
}
```

**Estimativa**: 10 minutos

---

## Checklist de Validação Pós-Fix

| Fix | Teste | Validação |
|-----|-------|-----------|
| T001 | Chamar increment-attempts 6x em 1min | Deve retornar 429 na 6ª |
| T001 | Chamar increment-attempts de IPs diferentes | Cada IP tem seu counter separado |
| T002 | Chamar getDashboardStats sem cookie de sessão | Deve retornar `{ error: 'Não autorizado' }` |
| T003 | `/_next/image?url=https://evil.supabase.co/img.jpg` | Deve retornar 400 (domínio não permitido) |
| T004 | `curl -I https://inbound-forge.app` | Não deve ter `X-Powered-By` no response |
| T005 | Chamar check-lock 10x em 1min | Deve retornar 429 |
| T006 | Chamar log-error 15x em 1min | Deve retornar 429 |
| T007 | `npm run build && npm run test` | 0 falhas após upgrade |
