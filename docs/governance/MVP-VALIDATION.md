# MVP VALIDATION — Inbound Forge

**Status:** canônico
**Última revisão:** 2026-04-23
**Fonte:** INTAKE.md §"Indicadores de Sucesso" (critério de validação do MVP)

---

## 1. Definição de MVP Validado

O MVP do Inbound Forge é considerado **validado** quando o seguinte estado operacional é atingido:

> Sistema operacional com **10+ posts publicados**, motor de sugestões gerando temas, calendário editorial funcional nos **3 canais** (blog interno, LinkedIn, Instagram).

Meta temporal: atingir este estado **até o fim da semana 8** pós-início da execução do pipeline.

MVP validado ≠ sucesso do sistema. Validar o MVP significa apenas que as peças funcionam ponta-a-ponta; sucesso é avaliado pelo `SUCCESS-CRITERIA.md` (90d).

---

## 2. Checklist de Validação

Gate binário — todos os itens devem estar ✓ para declarar MVP validado.

### 2.1 Volume
- [ ] **≥ 10 posts publicados** (soma dos 3 canais), contando apenas status `published`.
- [ ] **≥ 2 posts publicados em cada canal** (blog, LinkedIn, Instagram).

### 2.2 Motor Temático
- [ ] Theme Intelligence Service ativo, gerando sugestões diárias.
- [ ] Pelo menos **20 temas rankeados** na base (`Theme` com `score` calculado).
- [ ] Ranking reflete sinais reais (scraping + GEO bonus + feedback), não apenas defaults.

### 2.3 Pipeline Editorial
- [ ] Fluxo assistido funcional: sugestão → rascunho → revisão → aprovação → publicação.
- [ ] Calendário editorial renderiza posts dos 3 canais com drag-and-drop (TASK-2).
- [ ] Reconciliação de status (scheduled/published) funcional (TASK-3).

### 2.4 Geração de Conteúdo
- [ ] Artigos de blog gerados via Claude com estrutura summary-first.
- [ ] Posts sociais (LinkedIn/Instagram) gerados em pt-BR (ver `docs/compliance/LGPD-PURPOSE.md` e lang flag).
- [ ] Geração de imagens (Ideogram + Flux) integrada e com cache de reuso.

### 2.5 Infraestrutura
- [ ] Workers (scraping, imagem, publishing) rodando em Railway.
- [ ] Cost tracking operacional (cost-alert.ts) com threshold configurado.
- [ ] Backups Supabase ativos (7 dias retenção).

### 2.6 Observabilidade
- [ ] Health dashboard funcional com status verde/amarelo/vermelho.
- [ ] Logs de erro estruturados para os 3 workers.
- [ ] KPI API respondendo métricas de 90d (ver `SUCCESS-CRITERIA.md`).

### 2.7 Compliance
- [ ] Scraping opera apenas em fontes manualmente curadas.
- [ ] Pipeline de anonimização removendo PII antes da persistência.
- [ ] Log de coletas (data, fonte, volume, classificação) auditável.

---

## 3. Processo de Declaração

1. Operador executa checklist acima manualmente.
2. Preenche `output/docs/inbound-forge/governance/MVP-VALIDATION-RUN-{YYYY-MM-DD}.md` com evidência (screenshots, contagens, queries SQL).
3. Marca no sistema: `project_state.mvp_validated_at = <timestamp>`.
4. A partir deste momento, começa a contar o **ciclo de 90 dias** avaliado por `SUCCESS-CRITERIA.md`.

---

## 4. O Que NÃO Valida o MVP

Itens explicitamente **fora do gate** de MVP validado (são pós-MVP):

- YouTube Shorts via pipeline FFmpeg (TASK-16, pós-MVP roadmap)
- Tradução automática do blog para en-US / it-IT / es-ES
- Landing page SystemForge integrada
- Automação de publicação no LinkedIn (sempre modo assistido no MVP)
- Analytics avançado de ASoV (métrica de GEO é diagnóstico, não gate)

---

## Referências

- `COST-TARGETS.md`
- `SUCCESS-CRITERIA.md`
- `docs/POST-MVP-ROADMAP.md`
- INTAKE.md §"Indicadores de Sucesso"
