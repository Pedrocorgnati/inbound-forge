# SUCCESS CRITERIA — Inbound Forge

**Status:** canônico
**Última revisão:** 2026-04-23
**Horizonte:** 90 dias pós-MVP + avaliação pós-90d
**Fonte:** INTAKE.md §"Indicadores de Sucesso"

---

## 1. Metas dos Primeiros 90 Dias

Thresholds declarativos — são **goals do sistema**, não apenas métricas observadas.

| KPI | Meta 90d | Medido por |
|-----|----------|-----------|
| Leads gerados | 2/semana (8/mês) | `/api/v1/analytics/kpi` — `leadsGenerated` |
| Reuniões qualificadas marcadas | 1/mês | `/api/v1/analytics/kpi` — `qualifiedMeetings` |
| Volume de publicação | 5 posts/semana | `/api/v1/analytics/kpi` — `postsPublished` |
| Taxa conversão post → clique | ≥ 2% | `/api/v1/analytics/kpi` — `ctr` |
| Tempo médio produção de post (tema → pronto) | < 15 min | `/api/v1/analytics/kpi` — `avgProductionTimeMin` |
| Top 3 categorias por engajamento comercial | identificadas | `/api/v1/analytics/themes` |
| Temas geradores de oportunidades | registrados a partir do 1º lead | `Lead.sourceThemeId` |

Metas consideradas atingidas quando **mantidas por ≥ 3 semanas consecutivas** no período.

---

## 2. Critério de Sucesso Pós-90d

O sistema é considerado **bem-sucedido** se, ao final dos 90 dias:

> O custo operacional mensal está justificado por **pelo menos 1 reunião qualificada por mês** gerada exclusivamente por conteúdo do Inbound Forge.

Qualificação de reunião: lead que demonstrou intenção comercial concreta (pediu orçamento, pediu reunião, respondeu a CTA direta). Registrada manualmente pelo operador em `Lead.qualifiedAt`.

### Decisão pós-90d

| Cenário | Ação |
|---------|------|
| ≥ 1 reunião qualificada/mês + CPQL < $100 | **CONTINUAR** — manter operação, investir em melhorias incrementais |
| ≥ 1 reunião qualificada/mês + CPQL $100–$150 | **OTIMIZAR** — reduzir custo antes de continuar |
| < 1 reunião qualificada/mês em 2 meses seguidos | **REAVALIAR** — pausar automações pagas, revisar nicho e posicionamento |
| 0 leads qualificados em 90 dias | **ENCERRAR** — hipótese invalidada |

Registrar decisão em `output/docs/inbound-forge/governance/POST-90D-REVIEW.md`.

---

## 3. Métricas Complementares (não gate)

Servem de diagnóstico mas não determinam sucesso:

- AI Share of Voice (ASoV) — frequência de citação em respostas de IA vs. concorrentes (ver §"Estratégia GEO" no INTAKE)
- Assets reutilizados / assets gerados (economia de geração)
- Tempo médio operador por post (revisão + publicação)

---

## 4. Revisão e Versionamento

Critério revisto **apenas após cada ciclo completo de 90 dias**. Mudanças registradas em changelog no final deste doc.

### Changelog

- 2026-04-23 — versão inicial extraída do INTAKE.md

---

## Referências

- `COST-TARGETS.md` — faixas de custo e CPQL
- `MVP-VALIDATION.md` — critério pré-90d (MVP validado)
- INTAKE.md §"Indicadores de Sucesso"
