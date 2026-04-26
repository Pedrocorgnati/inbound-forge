# Security Report — Inbound Forge
Generated: 2026-04-06

## PHASE 1: Evidências de Código

### E001 — CRÍTICA: Account Lockout DoS via increment-attempts

**Arquivo:** `src/app/api/auth/increment-attempts/route.ts`
**OWASP:** A01, A04, A07

O endpoint `POST /api/auth/increment-attempts` estava na lista de rotas públicas do middleware
(`API_PUBLIC_PATHS` inclui `/api/auth`). Sem autenticação nem rate-limit por IP, qualquer
atacante podia chamar o endpoint repetidamente e bloquear contas legítimas por até 24h.

**Evidência:**
```typescript
// middleware.ts:9
const API_PUBLIC_PATHS = ['/api/health', '/api/v1/health', '/api/auth']
// → /api/auth/increment-attempts bypassa auth

// route original — sem requireSession() nem rate-limit por IP
export async function POST(request: NextRequest) {
  const { identifier } = await request.json()
  const attempts = await incrementLoginAttempts(identifier)  // qualquer e-mail!
  ...
}
```

**Fix aplicado:** Rate-limit por IP (max 10/5min via Redis) + validação de formato de e-mail.

---

### E002 — ALTA: Brute-Force Bypass via clear-attempts sem auth

**Arquivo:** `src/app/api/auth/clear-attempts/route.ts`
**OWASP:** A07

O endpoint público `POST /api/auth/clear-attempts` permitia que qualquer requisição não
autenticada zerasse o contador de tentativas de qualquer e-mail, anulando a proteção
anti-brute-force implementada em `rate-limit.ts`.

**Evidência:**
```typescript
// route original — sem requireSession()
export async function POST(request: NextRequest) {
  const { identifier } = await request.json()
  await clearLoginAttempts(identifier)   // qualquer e-mail sem sessão
  return NextResponse.json({ success: true })
}
```

**Fix aplicado:** `requireSession()` + verificação `identifier === user.email`.

---

### E003 — ALTA: SSRF em /api/sources/[id]/test

**Arquivo:** `src/app/api/sources/[id]/test/route.ts:57`
**OWASP:** A10

O endpoint fazia `fetch(source.url)` sem validar se a URL apontava para endereços internos.
A lista de bloqueio (`blocked-domains.ts`) cobria apenas redes sociais, não IPs privados.
Um usuário autenticado podia criar uma fonte com URL `http://169.254.169.254/latest/meta-data/`
(metadata AWS) ou `http://192.168.1.1/admin` e usar o endpoint `/test` para probing interno.

**Evidência:**
```typescript
// blocked-domains.ts — apenas social media, sem IPs privados:
export const BLOCKED_DOMAINS = ['linkedin.com', 'facebook.com', ...]

// route.ts:57 — fetch sem validação de IP privado
const response = await fetch(source.url, { ... })
```

**Fix aplicado:** Função `isPrivateOrInternalUrl()` que bloqueia 127.x, 10.x, 172.16-31.x,
192.168.x, 169.254.x (cloud metadata), ::1, fc00, fe80.

---

### E004 — ALTA: CVEs em dependências de produção (npm audit)

**OWASP:** A06

| Pacote | Severidade | CVE/Advisory | Status |
|--------|-----------|--------------|--------|
| `next@^14.2.21` | HIGH | GHSA-ggv3-7p47-pfv8 (request smuggling), GHSA-3x4c-7xq6-9pq8 (image cache) | Requer next@16 (breaking) |
| `vite` | HIGH | GHSA-4w7w-66w2-5vf9, GHSA-v2wj-q39q-566r, GHSA-p9ff-h696-f583 | ✅ Corrigido via `npm audit fix` |
| `@anthropic-ai/sdk@^0.80.0` | MODERATE | GHSA-5474-4w2j-mq4c (path traversal em memory tool) | Requer ^0.82.0 (breaking) |
| `eslint-config-next@^14.2.21` | HIGH | via glob CLI injection | Dev-only; fix com eslint-config-next@16 |

---

### E005 — MÉDIA: X-Powered-By header revela Next.js

**Arquivo:** `next.config.mjs`
**OWASP:** A05

Sem `poweredByHeader: false`, Next.js envia `X-Powered-By: Next.js` em todas as respostas,
revelando o framework ao atacante.

**Fix aplicado:** `poweredByHeader: false` adicionado ao `nextConfig`.

---

### E006 — MÉDIA: Math.random() em lock value e filenames

**Arquivos:** `src/lib/utils/distributed-lock.ts:27`, `src/lib/services/visual-asset.service.ts:33`
**OWASP:** A02

`Math.random()` não é criptograficamente seguro. No lock: valor previsível permite que um
atacante com acesso ao Redis roube locks. Em filenames: permite enumeração de URLs de assets.

**Fix aplicado:**
- `distributed-lock.ts`: `randomBytes(16).toString('hex')`
- `visual-asset.service.ts`: `randomUUID().ext`

---

### E007 — BAIXA: GA4_ID sem validação em dangerouslySetInnerHTML

**Arquivo:** `src/components/analytics/GA4Script.tsx:33`
**OWASP:** A03

`NEXT_PUBLIC_GA4_ID` era interpolado diretamente em `dangerouslySetInnerHTML.__html` sem
validação de formato. Comprometimento de .env ou pipeline de CI poderia injetar JS arbitrário.

**Fix aplicado:** Regex `G-[A-Z0-9]{4,12}` valida o ID antes de usar. ID inválido → componente
retorna null.

---

## PHASE 2: Headers de Segurança

| Header | Status (antes) | Status (depois) |
|--------|----------------|-----------------|
| Content-Security-Policy | ✅ Nonce dinâmico no middleware | ✅ Mantido |
| Strict-Transport-Security | ✅ prod-only em next.config.mjs | ✅ Mantido |
| X-Frame-Options | ✅ DENY | ✅ Mantido |
| X-Content-Type-Options | ✅ nosniff | ✅ Mantido |
| Referrer-Policy | ✅ strict-origin-when-cross-origin | ✅ Mantido |
| Permissions-Policy | ✅ camera/mic/geo off | ✅ Mantido |
| X-Powered-By | ❌ Presente (revela Next.js) | ✅ Removido (poweredByHeader: false) |

---

## PHASE 3: npm audit após correções

```
Before: 6 vulnerabilities (1 moderate, 5 high)
After:  5 vulnerabilities (1 moderate, 4 high)
Fixed:  vite (3 HIGH CVEs) via npm audit fix
Pending: next@14 HIGH (requer next@16 — breaking change)
         eslint-config-next HIGH (dev-only)
         @anthropic-ai/sdk MODERATE (requer ^0.82.0 — breaking)
```

## Arquivos Modificados

| Arquivo | Mudança |
|---------|---------|
| `src/app/api/auth/increment-attempts/route.ts` | Rate-limit por IP + validação de e-mail |
| `src/app/api/auth/clear-attempts/route.ts` | requireSession() + verificação de identidade |
| `src/app/api/sources/[id]/test/route.ts` | Bloqueio de IPs privados/SSRF |
| `next.config.mjs` | poweredByHeader: false |
| `src/lib/utils/distributed-lock.ts` | randomBytes em vez de Math.random |
| `src/lib/services/visual-asset.service.ts` | randomUUID em vez de Math.random |
| `src/components/analytics/GA4Script.tsx` | Validação de formato GA4_ID |
| `package-lock.json` | vite atualizado via npm audit fix |
