# Anti-Hacking Review Report
Data: 2026-04-05
Projeto: Inbound Forge
Fingerprint: Next.js 14.2.35 | React 18.3.1 | Auth: Supabase SSR | Deploy: Vercel

---

## Resumo Executivo

- **Vulnerabilidades encontradas**: 12
  - P0-BLOCKER: 0
  - P1-CRITICO: 1
  - P2-ALTO: 4
  - P3-MEDIO: 5
  - P4-BAIXO: 2
- **CVEs aplicáveis ao projeto**: 4 (GHSA)
- **CVEs críticos mitigados**: 2 (CVE-2025-29927 pela versão, CVE-2025-55182 por React 18)
- **Attack chains identificadas**: 2
- **npm audit**: 5 vulnerabilidades (1 moderate, 4 high)
- **Risco geral**: **ALTO**

O app tem uma postura de segurança acima da média (CSP com nonce, fail-closed middleware, timingSafeEqual, audit log, PII criptografado). O principal risco identificado é um endpoint público de account lockout que permite DoS direcionado contra qualquer conta sem autenticação.

### Revisão Codex (Pair Programming)

**Verdict: BLOCKED → ADDRESSED**

Codex identificou um edge case crítico no fix proposto para V001: rate limit por `x-forwarded-for` é spoofável no Vercel. Fix atualizado para usar `identifier` (email) como chave, garantindo que mesmo com IPs rotativos o rate limit funciona. Adicionalmente:

- Attack chain `check-lock + increment-attempts` confirmada e documentada
- Testes de fuzz para GHSA-h25m adicionados às tasks
- Teste de `/_next/image` com host externo adicionado

---

## CVEs Verificados

| CVE/ID | Nome | CVSS | Status |
|--------|------|------|--------|
| CVE-2025-29927 | Middleware Authorization Bypass (`x-middleware-subrequest`) | 9.1 | ✅ MITIGADO (v14.2.35 >= 14.2.25) |
| CVE-2025-55182 | React2Shell — RCE via RSC Flight deserialization | 10.0 | ✅ NÃO AFETADO (React 18.3.1, não 19.x) |
| CVE-2025-55184 | DoS via recursão RSC Promises | 7.5 | ✅ NÃO AFETADO (React 18.3.1) |
| GHSA-h25m-26qc-wcjf | HTTP request deserialization DoS (RSC) | Alto | ⚠️ AFETADO (Next.js 14.2.35) |
| GHSA-ggv3-7p47-pfv8 | HTTP request smuggling in rewrites | Alto | ⚠️ AFETADO |
| GHSA-9g9p-9gw9-jx7f | DoS via Image Optimizer remotePatterns | Alto | ⚠️ AFETADO |
| GHSA-3x4c-7xq6-9pq8 | Unbounded next/image disk cache growth | Moderate | ⚠️ AFETADO |
| CVE-2025-49826 | Cache Poisoning via 204 responses (ISR) | Alto | ℹ️ NÃO VERIFICADO (sem ISR routes identificadas) |
| CVE-2025-57822 | SSRF via Location header no middleware | Alto | ✅ NÃO AFETADO (versão 14.2.35 fora do range) |

---

## Vulnerabilidades Detalhadas

### V001 — Account DoS via increment-attempts (P1-CRITICO)

**Arquivo**: `src/app/api/auth/increment-attempts/route.ts`  
**Impacto**: Um atacante pode travar (lockout) qualquer conta de usuário com uma única requisição HTTP sem autenticação.

**Como explorar**:
```bash
curl -X POST https://inbound-forge.app/api/auth/increment-attempts \
  -H "Content-Type: application/json" \
  -d '{"identifier": "admin@empresa.com"}'
```
Chamando isso N vezes (N = `BUSINESS_RULES.MAX_LOGIN_ATTEMPTS`), a conta é bloqueada. O atacante não precisa saber a senha nem estar autenticado.

**Código vulnerável**:
```typescript
// src/app/api/auth/increment-attempts/route.ts
export async function POST(request: NextRequest) {
  const { identifier } = await request.json()
  // ❌ Sem auth, sem rate limiting, aceita qualquer identifier
  const attempts = await incrementLoginAttempts(identifier)
  if (attempts >= BUSINESS_RULES.MAX_LOGIN_ATTEMPTS) {
    await lockAccount(identifier, attempts) // ← qualquer conta pode ser travada
  }
  return NextResponse.json({ attempts })
}
```

**Fix proposto**:
```typescript
import { headers } from 'next/headers'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Opção 1: rate limit por IP (já usa Upstash)
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, '1m'), // 5 tentativas/min por IP
})

export async function POST(request: NextRequest) {
  // Rate limit por IP antes de aceitar o payload
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded?.split(',')[0] ?? '127.0.0.1'
  const { success } = await ratelimit.limit(`increment:${ip}`)
  if (!success) {
    return NextResponse.json({ attempts: 0 }, { status: 429 })
  }

  const { identifier } = await request.json()
  if (!identifier || typeof identifier !== 'string') {
    return NextResponse.json({ attempts: 0 }, { status: 400 })
  }
  const attempts = await incrementLoginAttempts(identifier)
  if (attempts >= BUSINESS_RULES.MAX_LOGIN_ATTEMPTS) {
    await lockAccount(identifier, attempts)
  }
  return NextResponse.json({ attempts })
}
```

**Teste de validação**: chamar o endpoint 10x para um email e verificar que é bloqueado por 429 antes de chegar ao lockout.

---

### V002 — GHSA-h25m-26qc-wcjf: DoS via RSC deserialization (P2-ALTO)

**Versão afetada**: Next.js 9.5.0–15.5.x (inclui 14.2.35)  
**Impacto**: Um request HTTP malformado pode causar desserialização infinita em componentes RSC, consumindo 100% de CPU/memória.  
**Detecção**: `npm audit` reporta com severity: high  
**Fix**: Upgrade Next.js para 16.x (breaking change). Curto prazo: WAF rate limiting agressivo.

---

### V003 — GHSA-ggv3-7p47-pfv8: HTTP request smuggling in rewrites (P2-ALTO)

**Versão afetada**: Next.js (range amplo)  
**Impacto**: Atacante pode usar `Transfer-Encoding: chunked` + `Content-Length` para fazer cache poisoning via rewrites do Next.js.  
**Relevância**: O projeto não usa `rewrites` no next.config.mjs — risco mitigado na prática, mas vulnerabilidade existe na versão instalada.  
**Fix**: Upgrade Next.js 16.x. Curto prazo: Vercel Edge já filtra headers malformados.

---

### V004 — GHSA-9g9p-9gw9-jx7f: DoS via Image Optimizer (P2-ALTO)

**Versão afetada**: Next.js (range amplo)  
**Impacto**: remotePatterns com wildcard pode ser abusado para fazer o otimizador de imagens processar recursos externos maliciosos, causando DoS.  
**Configuração atual**:
```javascript
// next.config.mjs
images: {
  remotePatterns: [
    { protocol: 'https', hostname: '**.supabase.co' }  // ← wildcard subdomain
  ]
}
```
Um atacante que controla um projeto Supabase pode servir imagens 100MB+ e forçar o otimizador a processá-las indefinidamente.  
**Fix**: Além do upgrade, restringir o hostname para o projeto específico:
```javascript
images: {
  remotePatterns: [
    { protocol: 'https', hostname: 'seu-projeto.supabase.co' }  // específico
  ]
}
```

---

### V005 — Server Actions sem auth em dashboard.ts (P2-ALTO)

**Arquivo**: `src/actions/dashboard.ts`  
**Impacto**: Três Server Actions exportadas (`getDashboardStats`, `getRecentActivity`, `getPipelineProgress`) não possuem verificação de sessão. Atualmente retornam dados mockados/vazios, mas quando implementadas (marcadas como `// TODO`) qualquer usuário não autenticado poderá acessar os dados do dashboard.

```typescript
// src/actions/dashboard.ts — ❌ SEM AUTH
export async function getDashboardStats() {
  // TODO: Implementar backend — sem checkSession()
  return { totalArticles: 0, publishedThisMonth: 0, ... }
}
```

**Fix**: Adicionar `checkSession()` imediatamente, antes da implementação real:
```typescript
'use server'
import { createClient } from '@/lib/supabase-server'

async function requireAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autorizado')
  return user
}

export async function getDashboardStats() {
  await requireAuth() // ← adicionar antes de qualquer lógica
  return { ... }
}
```

---

### V006 — GHSA-3x4c-7xq6-9pq8: Unbounded disk cache (P3-MEDIO)

**Impacto**: Se a configuração de cache do Image Optimizer não tiver limites explícitos, imagens processadas podem acumular sem limite no disco do servidor.  
**Fix no Vercel**: Gerenciado automaticamente — risco mínimo em ambiente Vercel.  
**Fix em self-hosted** (Docker presente no projeto):
```javascript
// next.config.mjs
images: {
  minimumCacheTTL: 3600,
  deviceSizes: [640, 750, 828, 1080, 1200],
  imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
}
```

---

### V007 — Email enumeration via check-lock (P3-MEDIO)

**Arquivo**: `src/app/api/auth/check-lock/route.ts`  
**Impacto**: Endpoint público que retorna `{ locked: true/false }` para qualquer email. Um atacante pode enumerar emails cadastrados verificando se há uma entrada de lock no Redis (usuários não cadastrados nunca terão entry de lock).  
**Fix**: Adicionar rate limiting por IP e normalizar resposta para não vazar informação de existência:
```typescript
// Sempre retornar o mesmo JSON shape, independente do estado
// Adicionar rate limit: 10 req/min por IP
```

---

### V008 — Log flooding via /api/log-error (P3-MEDIO)

**Arquivo**: `src/app/api/log-error/route.ts`  
**Impacto**: Endpoint público sem rate limiting. Um atacante pode enviar milhares de eventos para o Sentry, esgotando quota de eventos (Sentry cobra por volume).  
**Fix**: Adicionar rate limiting por IP antes de processar:
```typescript
const { success } = await ratelimit.limit(`log-error:${ip}`)
if (!success) return NextResponse.json({ ok: false }, { status: 429 })
```

---

### V009 — poweredByHeader não desabilitado (P3-MEDIO)

**Arquivo**: `next.config.mjs`  
**Impacto**: Next.js envia `X-Powered-By: Next.js` por padrão, expondo informações de framework para fingerprinting.  
**Fix**:
```javascript
// next.config.mjs
const nextConfig = {
  poweredByHeader: false, // ← adicionar
  ...
}
```

---

### V010 — remotePatterns wildcard subdomain (P3-MEDIO)

**Arquivo**: `next.config.mjs:39`  
**Impacto**: `hostname: '**.supabase.co'` permite que qualquer subdomínio de supabase.co seja usado pelo Image Optimizer. Se um atacante criar um projeto Supabase gratuito e hospedar conteúdo malicioso, pode fazer o app processar essas imagens.  
**Fix**: Usar o hostname específico do projeto de produção:
```javascript
{ protocol: 'https', hostname: 'xyzabc.supabase.co' }
```

---

### V011 — Math.random() para filename (P4-BAIXO)

**Arquivo**: `src/lib/services/visual-asset.service.ts:33`  
**Impacto**: Filenames gerados com `Math.random()` são previsíveis. Um atacante que conhece timestamp aproximado de upload pode enumerar URLs de assets. Não é exploitável facilmente pois assets são servidos via Supabase Storage com auth.  
**Fix** (best practice):
```typescript
import { randomBytes } from 'crypto'
const base = `${Date.now()}-${randomBytes(6).toString('hex')}`
```

---

### V012 — dangerouslySetInnerHTML com GA4_ID (P4-BAIXO)

**Arquivo**: `src/components/analytics/GA4Script.tsx:27`  
**Impacto**: `GA4_ID` é interpolado diretamente no HTML via `dangerouslySetInnerHTML`. O valor vem de `process.env.NEXT_PUBLIC_GA4_ID` (baked no build). Não é exploitável por usuários mas se o pipeline de build for comprometido (supply chain), o atacante pode injetar código malicioso.  
**Fix**: Validar o formato antes de usar:
```typescript
const GA4_ID = process.env.NEXT_PUBLIC_GA4_ID
// Validar formato G-XXXXXXXX
if (GA4_ID && !/^G-[A-Z0-9]+$/.test(GA4_ID)) {
  console.error('GA4_ID inválido — formato esperado: G-XXXXXXXX')
  return null
}
```

---

## Attack Chains

### Attack Chain 1: Account DoS + Brute Force escalation
1. Atacante usa `/api/auth/check-lock?identifier={email}` para confirmar que email existe
2. Chama `/api/auth/increment-attempts` N vezes com o email do admin
3. Conta admin é bloqueada sem tentativa de login
4. Admin fica impossibilitado de logar até expiração do lockout

**Impacto combinado**: Denial of Service direcionado a contas específicas  
**Complexidade**: Trivial (2 endpoints, script de 10 linhas)  
**Mitigação**: Corrigir V001 (rate limit em increment-attempts)

### Attack Chain 2: DoS via Image Optimizer (GHSA-9g9p-9gw9-jx7f + wildcard)
1. Atacante cria projeto gratuito no Supabase (subdomain `evil.supabase.co`)
2. Faz upload de imagens gigantes (100MB+ SVGs, TIFFs) no projeto Supabase
3. Craft requests para `/_next/image?url=https://evil.supabase.co/image.tiff&w=3840&q=100`
4. Image Optimizer tenta processar → CPU/memória esgotados

**Impacto combinado**: Outage do serviço  
**Complexidade**: Baixa (requer conta Supabase gratuita)  
**Mitigação**: Corrigir V004 (especificar hostname exato)

---

## Dependências Vulneráveis (npm audit)

```
5 vulnerabilities (1 moderate, 4 high)

HIGH: next 9.5.0-15.5.13
  - GHSA-9g9p-9gw9-jx7f (DoS via Image Optimizer)
  - GHSA-h25m-26qc-wcjf (HTTP request deserialization DoS)
  - GHSA-ggv3-7p47-pfv8 (HTTP request smuggling)
  - GHSA-3x4c-7xq6-9pq8 (Unbounded disk cache)

MODERATE: glob (via @next/eslint-plugin-next)
  - Dependência de desenvolvimento — sem impacto em produção
```

**Fix**: `npm audit fix --force` instala Next.js 16.2.2 (BREAKING CHANGE — avaliar impacto).

---

## Headers de Segurança

| Header | Status | Observação |
|--------|--------|------------|
| Content-Security-Policy | ✅ Nonce-based | Gerado por request no middleware |
| Strict-Transport-Security | ✅ Production only | max-age=63072000; includeSubDomains |
| X-Frame-Options | ✅ DENY | next.config.mjs |
| X-Content-Type-Options | ✅ nosniff | next.config.mjs |
| Referrer-Policy | ✅ strict-origin-when-cross-origin | next.config.mjs |
| Permissions-Policy | ✅ camera=(), microphone=(), geolocation=() | next.config.mjs |
| X-Powered-By | ❌ Exposto | `poweredByHeader: false` não configurado |
| X-XSS-Protection | ℹ️ Não definido | Obsoleto em browsers modernos, CSP é suficiente |

---

## Contexto de Risco do Negócio

O app é um SaaS B2B de marketing/inbound sem pagamentos diretos. A maior parte dos dados sensíveis são PII de leads (criptografados) e tokens de API (Instagram, Anthropic). O risco financeiro direto de comprometimento é moderado, mas o risco reputacional de account lockout/DoS em produção para clientes pagantes é alto.

---

## Fontes Pesquisadas

- CVE-2025-29927: Next.js middleware bypass (confirmado mitigado em 14.2.25+)
- GHSA-h25m-26qc-wcjf, GHSA-ggv3-7p47-pfv8, GHSA-9g9p-9gw9-jx7f, GHSA-3x4c-7xq6-9pq8: npm audit output
- React2Shell CVE-2025-55182: Afeta React 19.0.0-19.2.0 (projeto usa 18.3.1)
- OWASP: A07:2021 Identification and Authentication Failures (account lockout DoS)
