# Browserless — Setup Remoto

**Status:** canônico
**Última revisão:** 2026-04-23
**Escopo:** scraping-worker (Railway) em produção
**Origem:** TASK-11 — gaps CL-047, CL-173, CL-192

---

## 1. O que é Browserless

Serviço gerenciado que expõe navegadores Chromium headless via WebSocket. Elimina a necessidade de empacotar Chromium em containers de worker (~150 MB) e isola bloqueios/captchas do runtime do worker.

No Inbound Forge, o scraping-worker conecta ao Browserless via Playwright `chromium.connect({ wsEndpoint })`.

---

## 2. Provisionamento

### 2.1 Via Browserless Cloud (recomendado para início)

1. Criar conta em [https://www.browserless.io/](https://www.browserless.io/) — plano **Free Shared** (até 6h/mês).
2. No painel, copiar o **API Token**.
3. Montar a URL WebSocket:
   ```
   wss://chrome.browserless.io/playwright?token=SEU_TOKEN
   ```
4. Configurar variáveis de ambiente (ver §3).

### 2.2 Via Railway (self-hosted, pós-crescimento)

Para cenários com volume acima do free tier:

1. Criar novo service no Railway a partir da imagem oficial `ghcr.io/browserless/chromium:latest`.
2. Variáveis do service:
   ```
   TOKEN=<valor-forte-gerado>
   MAX_CONCURRENT_SESSIONS=3
   DEFAULT_STEALTH=true
   ```
3. Expor porta `3000` via Railway internal networking.
4. WS URL será: `wss://<service>.railway.internal/playwright?token=$TOKEN`

Custo self-host: Railway Hobby $5 + uso (~$5–15/mês em CPU/RAM).

---

## 3. Variáveis de Ambiente

### Worker (`workers/scraping-worker/.env`)

| Variável | Quando setar | Exemplo |
|----------|-------------|---------|
| `BROWSERLESS_WS_URL` | **prod** — modo remoto ativo | `wss://chrome.browserless.io/playwright?token=xyz` |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` | **dev/CI** — quando `BROWSERLESS_WS_URL` vazio | `/usr/bin/chromium-browser` |

### Root `.env` / `.env.example`

| Variável | Uso |
|----------|-----|
| `BROWSERLESS_API_KEY` | Informativo — registro do token |
| `BROWSERLESS_URL` | Informativo — endpoint base |
| `BROWSERLESS_WS_URL` | Espelho da variável do worker quando necessário para scripts CLI locais |
| `API_LIMIT_BROWSERLESS` | Teto mensal (minutos) — 500 é o cap Free |

---

## 4. Modo dev vs prod

| Ambiente | `BROWSERLESS_WS_URL` | Comportamento |
|----------|---------------------|---------------|
| **dev local** | vazio | `chromium.launch()` lança instância local. Requer chromium instalado no host. |
| **CI (GitHub Actions)** | vazio | Idem dev — usa chromium do container runner. |
| **staging** | setado | Conecta ao Browserless Free compartilhado. |
| **prod** | setado | Conecta ao Browserless (Cloud ou self-host). |

O wrapper `workers/scraping-worker/src/browserless-client.ts#getBrowser()` decide automaticamente. Logs do crawler incluem `mode=remote|local` para auditoria.

---

## 5. Protection guard (non-retry)

Fontes marcadas no schema com `isProtected=true` (seeds curadas / INT-093) ou `antiBotBlocked=true` (CL-030 — marcação runtime de bloqueio anti-bot) **não são enfileiradas** pelo worker. Implementação:

- `workers/scraping-worker/src/source-protection.ts` — espelha `src/lib/scraping/source-protection.ts`
- Guard aplicado em `workers/scraping-worker/src/worker.ts` antes de `crawlUrl`

Motivo: economizar minutos Browserless e evitar retry em URLs que comprovadamente bloqueiam o scraper.

---

## 6. Troubleshooting

| Sintoma | Causa provável | Ação |
|---------|---------------|------|
| `Error: connect ECONNREFUSED` | WS URL mal formada ou token inválido | Validar URL no painel Browserless |
| `429 Too Many Requests` | Free tier esgotado | Reduzir `MAX_CONCURRENT_PAGES` ou upgrade de plano |
| `Target page closed` | Navegação timeout vs TTL Browserless | Aumentar `PAGE_TIMEOUT_MS` (atual 30s) |
| Crawler retorna rawText vazio | Site bloqueou Playwright (captcha/Cloudflare) | Marcar source como `antiBotBlocked=true` (CL-030) |

---

## 7. Monitoramento

Métricas expostas no dashboard `/health`:

- `API_LIMIT_BROWSERLESS` — minutos totais mensais
- `browserlessUsageMinutes` — minutos consumidos (agregado do worker)
- Alerta `BROWSERLESS_QUOTA` em 80% e 95% do cap.

---

## Referências

- [Browserless docs](https://docs.browserless.io/)
- [Playwright connect](https://playwright.dev/docs/api/class-browsertype#browser-type-connect)
- `docs/compliance/LGPD-PURPOSE.md` — política de fontes controladas
- `docs/governance/COST-TARGETS.md` — thresholds de custo operacional
