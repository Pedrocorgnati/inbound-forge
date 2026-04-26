# Security Tasks — Inbound Forge
Generated: 2026-04-06

---

### T001 - Proteger /api/auth/increment-attempts contra Account Lockout DoS

**Severidade:** CRÍTICA
**OWASP:** A01, A04, A07
**Tipo:** SEQUENTIAL
**Dependências:** none
**Arquivos:**
- modificar: `src/app/api/auth/increment-attempts/route.ts`

**Descrição:**
O endpoint `POST /api/auth/increment-attempts` é público (middleware bypassa `/api/auth/*`) e não
possui autenticação nem rate-limiting por IP. Um atacante pode chamar este endpoint em loop com
qualquer e-mail e bloquear a conta da vítima por até 24h. Attack vector:
```
for i in range(20): POST /api/auth/increment-attempts {"identifier":"victim@example.com"}
→ conta bloqueada por 24h
```
Fix: adicionar rate-limit por IP (máx 10 calls/5min) e validar formato de e-mail.

**Critérios de Aceite:**
- [ ] Endpoint retorna 429 após 10 chamadas do mesmo IP em 5 minutos
- [ ] Identifier com formato inválido (não-email) retorna 400
- [ ] Fluxo legítimo de login ainda funciona normalmente
- [ ] Teste: npm run test (unit) + teste manual de bloqueio por IP

**Estimativa:** 1h

---

### T002 - Proteger /api/auth/clear-attempts com autenticação de sessão

**Severidade:** ALTA
**OWASP:** A07
**Tipo:** SEQUENTIAL
**Dependências:** none
**Arquivos:**
- modificar: `src/app/api/auth/clear-attempts/route.ts`

**Descrição:**
O endpoint `POST /api/auth/clear-attempts` é público e não verifica sessão. Qualquer requisição
não autenticada pode limpar o contador de tentativas de qualquer e-mail, anulando a proteção
anti-brute-force. Fix: exigir sessão ativa e verificar que `identifier === user.email`.

**Critérios de Aceite:**
- [ ] Endpoint retorna 401 sem sessão válida
- [ ] Endpoint retorna 403 se identifier != email do usuário autenticado
- [ ] Fluxo pós-login bem-sucedido ainda limpa tentativas normalmente

**Estimativa:** 30min

---

### T003 - Prevenir SSRF em /api/sources/[id]/test

**Severidade:** ALTA
**OWASP:** A10
**Tipo:** SEQUENTIAL
**Dependências:** none
**Arquivos:**
- modificar: `src/app/api/sources/[id]/test/route.ts`

**Descrição:**
O endpoint faz `fetch(source.url)` com URL vinda do banco. Embora domínios sociais sejam bloqueados,
não há validação de IPs privados/internos. Um usuário autenticado pode criar uma fonte com URL
`http://169.254.169.254/latest/meta-data/` (AWS metadata) ou `http://192.168.x.x/admin` e usar
este endpoint para probing de infraestrutura interna. Fix: bloquear ranges de IP privados e
link-local antes do fetch.

**Critérios de Aceite:**
- [ ] URLs apontando para 127.x, 10.x, 172.16-31.x, 192.168.x, 169.254.x retornam 422
- [ ] localhost e ::1 bloqueados
- [ ] URLs externas legítimas continuam funcionando

**Estimativa:** 45min

---

### T004 - Adicionar poweredByHeader: false ao next.config.mjs

**Severidade:** MÉDIA
**OWASP:** A05
**Tipo:** PARALLEL-GROUP-1
**Dependências:** none
**Arquivos:**
- modificar: `next.config.mjs`

**Descrição:**
Sem `poweredByHeader: false`, Next.js envia o header `X-Powered-By: Next.js` em todas as
respostas, revelando a tecnologia e versão do framework. Fix: adicionar a propriedade ao
objeto `nextConfig`.

**Critérios de Aceite:**
- [ ] Header `X-Powered-By` ausente nas respostas de produção
- [ ] Build não quebra

**Estimativa:** 5min

---

### T005 - Substituir Math.random() por crypto em distributed-lock.ts

**Severidade:** MÉDIA
**OWASP:** A02
**Tipo:** PARALLEL-GROUP-1
**Dependências:** none
**Arquivos:**
- modificar: `src/lib/utils/distributed-lock.ts`

**Descrição:**
O valor do lock (`lockValue`) é gerado com `Math.random()`, que não é criptograficamente seguro.
Um atacante com acesso ao Redis poderia prever ou adivinhar o valor e roubar o lock. Fix: usar
`crypto.randomBytes(16).toString('hex')`.

**Critérios de Aceite:**
- [ ] Lock value usa crypto.randomBytes
- [ ] Comportamento de lock/unlock preservado

**Estimativa:** 10min

---

### T006 - Substituir Math.random() por crypto.randomUUID() em visual-asset.service.ts

**Severidade:** MÉDIA
**OWASP:** A02
**Tipo:** PARALLEL-GROUP-1
**Dependências:** none
**Arquivos:**
- modificar: `src/lib/services/visual-asset.service.ts`

**Descrição:**
`generateFileName` usa `Date.now()-Math.random()` para nomear arquivos no Storage. Math.random()
é previsível, permitindo enumeração de URLs de assets. Fix: usar `crypto.randomUUID()`.

**Critérios de Aceite:**
- [ ] Nome de arquivo usa randomUUID
- [ ] Upload e listagem continuam funcionando

**Estimativa:** 10min

---

### T007 - Validar formato de GA4_ID antes da injeção em dangerouslySetInnerHTML

**Severidade:** BAIXA
**OWASP:** A03
**Tipo:** PARALLEL-GROUP-1
**Dependências:** none
**Arquivos:**
- modificar: `src/components/analytics/GA4Script.tsx`

**Descrição:**
`GA4_ID` (de `NEXT_PUBLIC_GA4_ID`) é interpolado diretamente em `dangerouslySetInnerHTML.__html`
sem validação de formato. Embora seja uma variável de ambiente de build-time, comprometimento
do pipeline (.env, CI/CD) poderia injetar código. Fix: validar o padrão `G-XXXXXXXXXX` antes
de usar.

**Critérios de Aceite:**
- [ ] GA4_ID com formato inválido não é injetado (componente retorna null)
- [ ] GA4 continua carregando normalmente com ID válido

**Estimativa:** 15min

---

### T008 - Atualizar dependências vulneráveis

**Severidade:** ALTA (next, vite) / MÉDIA (@anthropic-ai/sdk)
**OWASP:** A06
**Tipo:** SEQUENTIAL
**Dependências:** none
**Arquivos:**
- modificar: `package.json`

**Descrição:**
npm audit reporta:
- `next@^14.2.21` — HIGH CVE (fix: next@16.2.2, major bump — avaliar breaking changes)
- `vite` — HIGH CVE (fix: disponível, semver patch/minor)
- `@anthropic-ai/sdk@^0.80.0` — MODERATE CVE GHSA-5474-4w2j-mq4c (fix: ^0.82.0, major bump)
- `eslint-config-next@^14.2.21` — HIGH (via glob CLI; dev-only)

Ação imediata: atualizar vite. Next e anthropic-ai/sdk requerem avaliação de breaking changes
antes do upgrade.

**Critérios de Aceite:**
- [ ] npm audit --audit-level=high retorna 0 vulnerabilidades críticas/altas em prod deps
- [ ] vite atualizado
- [ ] Build e testes passando após upgrade

**Estimativa:** 2h (com testes de regressão)
