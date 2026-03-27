# INT-107: Custo Operacional — Análise e Thresholds

**Rastreabilidade:** INT-107
**Data:** 2026-03-26
**Owner:** Pedro Corgnati
**Data de revisão:** 2026-06-01
**Status:** DECISÃO TOMADA — Baseline $40-55/mês com thresholds de alerta

---

## Contexto

Análise de custo operacional do Inbound Forge MVP com cenários de crescimento e thresholds acionáveis.
Monitoramento em tempo real via `/api/v1/api-usage` e `/api/v1/health/detailed`.

---

## Baseline MVP — Cenário: 50 posts/mês

| Serviço | Custo Estimado | Unidade | Uso Típico |
|---------|---------------|---------|------------|
| Anthropic Claude (Haiku/Sonnet) | $10-20/mês | ~200k tokens | 50 peças de conteúdo |
| Ideogram (imagens) | $5-10/mês | ~50 req | 50 imagens (1/post) |
| Flux/Fal.ai | $2-5/mês | ~50 req | Imagens adicionais |
| Browserless.io Cloud | $25/mês | Fixo | 6h/mês |
| Supabase (Free) | $0 | — | até 500MB |
| Vercel (Hobby) | $0 | — | até 100GB |
| Upstash Redis (Free) | $0 | — | até 10k req/dia |
| **Total Baseline** | **$42-60/mês** | | |

**Estimativa realista: $45/mês** (centralizando o range)

---

## Cenários de Crescimento

| Cenário | Posts/mês | Claude | Ideogram | Browserless | **Total** |
|---------|-----------|--------|----------|-------------|-----------|
| Baseline | 50 | $15 | $7 | $25 | **~$47/mês** |
| Crescimento 2x | 100 | $25 | $14 | $25 | **~$64/mês** |
| Crescimento 5x | 250 | $55 | $35 | $25 | **~$115/mês** |
| + Upgrades infra | 250+ | $55 | $35 | $10 (self-hosted) | **~$100/mês** |

**Nota:** Com self-hosted Browserless em crescimento 5x, economia de $15/mês.

---

## Thresholds de Alerta (implementados em cost-alert.ts)

| Threshold | Valor | Ação Recomendada |
|-----------|-------|------------------|
| 🟡 Amarelo (80%) | $35/mês | Revisar uso de Claude e Ideogram. Verificar se há geração excessiva de conteúdo. Otimizar prompts. |
| 🔴 Vermelho (100%) | $55/mês | Pausar geração automática. Revisar limites por serviço. Considerar upgrade de plano ou otimização. |

**Monitoramento em tempo real:** `GET /api/v1/api-usage` → breakdown por serviço

---

## Estratégias de Redução de Custo

| Estratégia | Economia Estimada | Quando Aplicar |
|-----------|------------------|----------------|
| Migrar para Browserless self-hosted (Railway) | -$15/mês | Após crescimento 2x |
| Usar Claude Haiku para conteúdo simples (em vez de Sonnet) | -30-40% em Claude | Imediato |
| Cache de geração de temas (Redis) | -20% em Claude | Já implementado (TASK-4) |
| Batch de imagens (menos req) | -20% em Ideogram | Quando > 100 posts/mês |

---

## Monitoramento Mensal

**Processo:** No dia 1 de cada mês:
1. Acessar `/api/v1/health/detailed` → seção ApiUsage
2. Comparar com baseline de $45/mês
3. Se acima de $35: revisar relatório de uso por serviço
4. Se acima de $55: ativar modo de economia (reduzir frequência de geração)

**Dashboard:** `/health/detailed` → `learnToRankThreshold` + ApiUsageBreakdown (module-15)

---

## ROI Estimado

Custo do sistema (Pedro): $0 (uso pessoal, sem clientes pagantes no MVP)
Valor gerado: Crescimento de autoridade, leads, oportunidades de negócio.

**Break-even:** Se uma oportunidade de negócio/mês for gerada via LinkedIn/blog → ROI positivo.

---

## Data de Revisão

**2026-06-01** — ajustar baseline com dados reais de 3 meses de operação.
Revisão de custo: todo dia **1 de cada mês**.
