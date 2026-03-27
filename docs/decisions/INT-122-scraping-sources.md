# INT-122: Lista de Fontes de Scraping

**Rastreabilidade:** INT-122
**Data:** 2026-03-26
**Owner:** Pedro Corgnati
**Data de revisão:** 2026-04-15
**Status:** PENDENTE — Template criado, operador deve preencher antes de ativar scraping worker

---

## Contexto

O worker de scraping (module-6) precisa de uma lista curada de fontes para monitorar tendências
e gerar temas relevantes. Este documento é o template para Pedro Corgnati preencher com suas
fontes específicas de mercado.

**Ativar scraping worker somente após preencher este documento.**

---

## Instruções de Preenchimento

Para cada fonte:
- Verificar que o site permite scraping (robots.txt)
- Anotar frequência ideal de scraping
- Indicar qual tipo de conteúdo interessa (tendências, notícias, análises)

---

## TEMPLATE — Preencher com Dados Reais

### 1. Fontes de Notícias e Tendências do Setor

| URL | Descrição | Frequência | Tipo de Conteúdo |
|-----|-----------|-----------|------------------|
| (ex: techcrunch.com) | (ex: Tech news EN) | (Diária/Semanal) | (ex: Tendências) |
| | | | |
| | | | |

### 2. Blogs de Referência no Nicho

| URL | Descrição | Frequência | Relevância |
|-----|-----------|-----------|-----------|
| | | | |
| | | | |

### 3. LinkedIn Thought Leaders a Monitorar

*(Nota: LinkedIn não permite scraping direto — usar monitoramento manual ou RSS alternativo)*

| Perfil/Nome | Área de Expertise | Cadência de Posts | Alternativa RSS |
|-------------|------------------|-------------------|-----------------|
| | | | |
| | | | |

### 4. Fontes RSS/Newsletter

| RSS URL | Descrição | Frequência |
|---------|-----------|-----------|
| | | |
| | | |

### 5. Fontes de Dados de Mercado

| URL/API | Descrição | Tipo | Custo |
|---------|-----------|------|-------|
| | | | |

---

## Frequência Recomendada

| Cadência | Tipo de Fonte |
|----------|--------------|
| **Diária** | Notícias de alta relevância, tendências em tempo real |
| **Semanal** | Blogs de análise, relatórios setoriais |
| **Mensal** | Relatórios de mercado, pesquisas anuais |

---

## Configuração no Worker

Após preencher, atualizar o worker de scraping em `workers/scraping/` com as URLs e configurações.

---

## Data de Revisão

**2026-04-15** — Pedro deve preencher e validar antes desta data para ativar o scraping.
