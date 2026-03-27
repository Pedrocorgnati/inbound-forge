# INT-123: Plano Browserless — Scraping Headless

**Rastreabilidade:** INT-123
**Data:** 2026-03-26
**Owner:** Pedro Corgnati
**Data de revisão:** 2026-06-01
**Status:** DECISÃO TOMADA — Browserless.io Cloud para MVP

---

## Contexto

O worker de scraping usa Playwright para acessar sites que bloqueiam scraping simples (JS rendering,
anti-bot). Browserless.io provê Chromium como serviço via WebSocket, evitando manutenção de browser.

---

## Opções Analisadas

| Opção | Custo | Limite | Vantagens | Desvantagens |
|-------|-------|--------|-----------|-------------|
| **Browserless.io Cloud** | $25/mês | 6h/mês | Zero manutenção, uptime garantido | Custo fixo, limite de horas |
| Self-hosted no Railway | ~$10/mês | Ilimitado | Custo menor, sem limites | Manutenção, uso de RAM Railway |
| Playwright local (dev) | $0 | Limitado | Gratuito | Não funciona em Vercel/Railway |
| Puppeteer Cloud alternativo | $15-30/mês | Variado | Opcões | Menos documentado |

---

## Decisão MVP

**Browserless.io Cloud ($25/mês, 6h/mês)**

**Justificativa:**
1. Zero overhead de manutenção para MVP
2. 6h/mês suficiente para scraping de 50-100 URLs/mês (scraping médio de 3-5 min/URL)
3. Integração direta via `BROWSERLESS_URL` + `BROWSERLESS_API_KEY` já configurados
4. Suporte a Playwright nativo

---

## Critério de Migração para Self-Hosted

Migrar para self-hosted no Railway quando:
- Uso > **4h/mês por 2 meses consecutivos** (sinal de escala)
- OU custo total > $30/mês (Browserless aumentou preços)

**Economia esperada:** $25/mês → $10/mês (-$15/mês)

### Como implementar self-hosted (quando necessário)

```yaml
# railway.json — adicionar serviço browserless
{
  "services": [
    {
      "name": "browserless",
      "image": "browserless/chrome:latest",
      "env": {
        "TOKEN": "$BROWSERLESS_INTERNAL_TOKEN",
        "MAX_CONCURRENT_SESSIONS": "2"
      }
    }
  ]
}
```

Atualizar `BROWSERLESS_URL` para `ws://browserless:3000` (Railway internal network).

---

## Monitoramento de Uso

Verificar uso em: [https://chrome.browserless.io/stats](https://chrome.browserless.io/stats)

**Frequência:** Verificar mensalmente junto com INT-121.

---

## Data de Revisão

**2026-06-01** — decidir se migrar para self-hosted com base em 3 meses de dados reais.
