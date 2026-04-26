# COST TARGETS — Inbound Forge

**Status:** canônico
**Última revisão:** 2026-04-23
**Owner:** operador (usuário único)
**Fonte:** INTAKE.md §"Estimativa de Custo Operacional Mensal"

---

## 1. Faixa de Custo Operacional

Custo total estimado do MVP: **USD 11–76/mês**, cenário mais provável **USD 20–35/mês** usando free tiers onde possível.

Uso tipico: 5 posts/semana (≈20 posts/mês).

| Componente | Estimativa/mês | Free tier inicial |
|------------|----------------|-------------------|
| Claude API (geração + classificação, ~150K tokens) | $5–10 | — |
| Ideogram 2.0 (backgrounds com texto, ~20 imgs) | $0.80 | — |
| Flux 2 Schnell (backgrounds sem texto, ~20 imgs) | $0.30 | — |
| Browserless (scraping remoto) | $0 (até 6h/mês) | sim |
| Upstash Redis | $0 (500K cmds/mês) | sim |
| Railway (workers: Hobby + uso) | $5–20 | não |
| Supabase (free/Pro) | $0–25 | sim |
| Vercel (Hobby/Pro) | $0–20 | sim |
| **TOTAL** | **$11–76** | — |

Custos em BRL não são alvo operacional; o sistema opera em USD (APIs internacionais). A UI exibe BRL apenas em vistas de custo/financeiro relacionadas ao **mercado-alvo brasileiro** (ver `docs/audits/BRL-AUDIT-*`).

### Política dual-currency (TASK-14 CL-210)

| View / componente | Moeda | Helper |
|-------------------|-------|--------|
| `ApiCostBreakdown` (custos por provider) | USD | `formatCurrency(v, 'USD')` |
| `CostChip` (total mês no header) | USD | `formatCurrency(v, 'USD')` |
| `CostThresholdField` (teto configurável) | USD | texto literal "US$" |
| `MonthlyCostBadge` (badge do header) | BRL | `formatCurrency(v)` default |
| Receita / leads (revenue views) | BRL | `formatBRL(v)` |

Regra: **custos de fornecedor em USD, valores operacionais do operador em BRL**. Nunca converter um para o outro na UI (evita erros de conversão e taxa de câmbio desatualizada). Se precisar de conversão, usar um helper dedicado com rate cacheado.

---

## 2. Thresholds e Alertas

Implementação técnica: `lib/cost/cost-alert.ts`, endpoint `api/v1/settings/cost-threshold`, banner `WorkerAlert`.

Política declarativa:

| Nível | Threshold (% do teto mensal configurado) | Ação |
|-------|------------------------------------------|------|
| INFO | 50% | log, sem alerta visual |
| WARN | 75% | banner amarelo no dashboard |
| CRIT | 90% | banner vermelho + pausar workers não críticos |
| HARD | 100% | bloquear novas gerações pagas; permitir apenas rascunhos e revisão |

Teto padrão inicial: **USD 50/mês** (configurável via `/settings/cost-threshold`).

Providers cobertos pelo rastreamento de custo: Claude, Ideogram, Flux, Browserless. Infra fixa (Railway, Supabase, Vercel) não é contabilizada em tempo real — apenas conciliada mensalmente.

---

## 3. Cadência de Revisão

**Review mensal obrigatório** (dia 5 de cada mês, cobrindo mês anterior):

1. Exportar relatório de custo por provider via `/analytics/cost` (export CSV).
2. Cruzar contra número de leads qualificados (`KPI API /analytics/kpi` — métrica `qualifiedMeetings`).
3. Calcular **Cost per Qualified Lead (CPQL)** = custo total mensal / leads qualificados.
4. Decisão:
   - CPQL < USD 50 → manter configuração.
   - CPQL USD 50–150 → avaliar otimização de prompts / redução de frequência.
   - CPQL > USD 150 → reavaliar viabilidade do sistema (gate de sucesso pós-90d, ver `SUCCESS-CRITERIA.md`).
5. Registrar a revisão em `output/docs/inbound-forge/governance/COST-REVIEW-LOG.md` (append-only).

---

## 4. Justificativa de Gasto

Princípio declarativo: **o custo operacional mensal precisa ser justificável pelo volume de leads gerados**. Sem receita direta — o retorno é indireto via leads que se convertem em projetos de software personalizado.

Baseline de justificativa: 1 projeto fechado por ano via Inbound Forge cobre 12 meses de operação no teto de $76/mês.

---

## Referências

- `SUCCESS-CRITERIA.md` — metas e critérios pós-90d
- `MVP-VALIDATION.md` — critérios de validação do MVP
- INTAKE.md §"Estimativa de Custo Operacional Mensal" e §"Riscos e Mitigações"
