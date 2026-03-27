# PENDING-DECISIONS — Inbound Forge v1.0.0

**Criado por:** module-16/TASK-6
**Data:** 2026-03-26
**Owner:** Pedro Corgnati

---

## Visão Geral

Registro central de decisões arquiteturais e operacionais pendentes ou tomadas para o Inbound Forge.
Revisão obrigatória: **2026-06-01** (3 meses pós-MVP).

---

## Decisões Pendentes (Ação Requerida)

| Código | Título | Status | Owner | Prazo de Revisão | Documento |
|--------|--------|--------|-------|-----------------|-----------|
| INT-122 | Lista de Fontes de Scraping | **PENDENTE** — operador deve preencher | Pedro | 2026-04-15 | [INT-122](./INT-122-scraping-sources.md) |
| INT-124 | Mapeamento de Concorrentes | **PENDENTE** — template a preencher | Pedro | 2026-06-01 | [INT-124](./INT-124-competitors-mapping.md) |

---

## Decisões Tomadas

| Código | Título | Decisão | Owner | Data | Documento |
|--------|--------|---------|-------|------|-----------|
| INT-121 | Upgrade Supabase/Vercel | Manter Free até atingir 80% dos limites | Pedro | 2026-03-26 | [INT-121](./INT-121-supabase-vercel-plan.md) |
| INT-123 | Plano Browserless | Browserless.io Cloud ($25/mês) para MVP | Pedro | 2026-03-26 | [INT-123](./INT-123-browserless-plan.md) |
| INT-107 | Custo Operacional MVP | Baseline $40-55/mês, threshold vermelho $55 | Pedro | 2026-03-26 | [INT-107](./INT-107-operational-cost.md) |
| INT-097 | Blog MDX Export | Won't MVP — implementar com 20+ artigos | Pedro | 2026-03-26 | [INT-097](./INT-097-blog-mdx-export.md) |

---

## Features Pós-MVP

| Feature | Prioridade | Quarter | Documento |
|---------|-----------|---------|-----------|
| COMP-004: Lead/ApiUsageLog TTL cron | **CRÍTICO** (compliance LGPD) | Q3 2026 | [POST-MVP-ROADMAP](../POST-MVP-ROADMAP.md) |
| Learn-to-rank cron (INT-075) | Alto | Q3 2026 | [POST-MVP-ROADMAP](../POST-MVP-ROADMAP.md) |
| Browserless self-hosted | Médio | Q3 2026 | [INT-123](./INT-123-browserless-plan.md) |
| Resend alertas email (NOTIF-001) | Médio | Q3 2026 | [POST-MVP-ROADMAP](../POST-MVP-ROADMAP.md) |
| Blog MDX export (INT-097) | Baixo | Q4 2026 | [INT-097](./INT-097-blog-mdx-export.md) |
| Multi-user support | Alto | Q4 2026 | [POST-MVP-ROADMAP](../POST-MVP-ROADMAP.md) |

---

## Processo de Revisão

1. **Revisão mensal:** abrir este arquivo no dia 1 de cada mês
2. Verificar se limites de serviços foram atingidos (INT-121) via `/health/detailed`
3. Verificar custos reais no ApiUsageBreakdown — ajustar baseline INT-107 se necessário
4. Atualizar status de pendências resolvidas

---

## Próxima Revisão

**2026-06-01** — revisar todos os documentos após 3 meses de operação com dados reais.
