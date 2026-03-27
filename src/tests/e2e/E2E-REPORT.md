# E2E-REPORT — Inbound Forge

**Módulo:** module-16/TASK-2
**Data:** 2026-03-26
**Configuração:** Playwright + 2 projetos (chromium desktop + iPhone 13 mobile)

---

## Resultados por Flow

| Flow | Descrição | Módulos | Prioridade | Desktop | Mobile | Status |
|------|-----------|---------|-----------|---------|--------|--------|
| F1 | Theme creation → scoring → content | 5,6,7,8 | Alta | PENDING* | PENDING* | READY |
| F2 | Content → image → asset | 8,9,10 | Alta | PENDING* | N/A | READY |
| F3 | Content → schedule → publish (blog) | 8,11,12 | Alta | PENDING* | N/A | READY |
| F4 | Content → schedule → publish (LinkedIn) | 8,12 | Alta | PENDING* | N/A | READY |
| F5 | Post → UTM link → lead capture | 12,13 | Alta | PENDING* | PENDING* | READY |
| F6 | Lead → conversion → theme.conversionScore | 13,7 | Alta | PENDING* | PENDING* | READY |
| F7 | All data → analytics funnel | 12,13,14 | Alta | PENDING* | PENDING* | READY |
| F8 | Reconciliation detection → resolve | 13,14 | Média | PENDING* | N/A | READY |
| F9 | Onboarding completo (7 passos) | 15 | Alta | PENDING* | PENDING* | READY |
| F10 | Health polling → alert → resolve | 15,1 | Média | PENDING* | N/A | READY |

*PENDING: requer ambiente com banco e app rodando. Testes estruturados e prontos para execução.

---

## Flows Críticos (Desktop + Mobile)

| Flow | Critério Mobile | Status |
|------|----------------|--------|
| F1 | Zero overflow horizontal em /knowledge | READY |
| F5 | LeadForm cabe em 375px sem scrollX | READY |
| F6 | ConversionForm acessível em mobile | READY |
| F9 | Wizard onboarding navegável em 375px | READY |

---

## Configuração

```bash
# Executar todos os flows (desktop + mobile)
npx playwright test src/tests/e2e/ --reporter=html

# Apenas flows críticos
npx playwright test src/tests/e2e/flow-5* src/tests/e2e/flow-6* src/tests/e2e/flow-9*

# Apenas mobile
npx playwright test src/tests/e2e/ --project=mobile
```

---

## Pré-requisitos para execução completa

1. `DATABASE_URL` e `DIRECT_URL` configurados (banco PostgreSQL)
2. `NEXTAUTH_SECRET` e `NEXTAUTH_URL` configurados
3. App rodando em `http://localhost:3000` (`npm run dev` ou `npm run start`)
4. Usuário de teste criado: `e2e@inbound-forge.test` / `E2eTest1234!`
5. `npx playwright install chromium` executado

---

## Veredito

**APROVADO COM RESSALVAS** — Testes implementados e prontos. Execução completa requer ambiente de staging com banco de dados populado.
