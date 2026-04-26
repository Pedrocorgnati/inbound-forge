# /content:generate-angles — Gera angulos via Claude Code (Max subscription)

Gera 3 angulos de conteudo para os top N temas do Inbound Forge usando a subscription Max (zero custo de API).

## Uso

```
/content:generate-angles [N]   # N = quantidade de temas (default: 5)
```

## Fluxo

```
1. Conectar ao banco via Prisma CLI ou API local:
   - Ler top {N} temas com status ACTIVE ordenados por score DESC
   - Para cada tema, incluir: pain, case, solutionPattern

2. Para cada tema:
   a. Montar contexto identico ao usado pelo AngleGenerationService:
      - TEMA: {title}
      - DORES: {pain.title}: {pain.description}
      - CASES: {case.name}: {case.outcome}
      - PADRAO: {solutionPattern.name}: {solutionPattern.description}

   b. Gerar 3 angulos com o framework E-E-A-T:
      - AGGRESSIVE: amplifica a dor, cria urgencia, mostra o caminho
      - CONSULTIVE: educa com profundidade tecnica, sem vender
      - AUTHORIAL: case pessoal com prova social e resultado

   c. Formatar como JSON:
      [{ "angle": "AGGRESSIVE", "body": "...", "ctaText": "...", "hashtags": [...] }, ...]

   d. Chamar POST /api/content/{themeId}/angles/import com:
      { "angles": [...], "source": "claude-cli" }

   e. Exibir confirmacao: "Tema '{title}' — 3 angulos importados"

3. Exibir resumo final:
   - Total de temas processados
   - Total de angulos gerados
   - Proxima acao sugerida: "Revise os angulos no dashboard → /content"
```

## Contexto E-E-A-T para Geracao

```
QUEM SOMOS:
- SystemForge — software sob medida para PMEs brasileiras
- Pedro Corgnati, desenvolvedor full-stack
- Diferencial: documentation-first, entrega em milestones, ROI mensuravel

PUBLICO-ALVO:
- PMEs brasileiras (5-200 funcionarios)
- Setores: servicos B2B, clinicas, distribuidoras, construtoras, escritorios juridicos, academias
- Dor principal: processos manuais que nao escalam

TOM DE VOZ:
- Profissional mas acessivel
- Dados quantificaveis sempre que possivel
- Cases reais com resultados mensuraveis
- CTA: WhatsApp para diagnostico gratuito de 30 minutos

CANAL: LinkedIn (ate 3000 chars) ou Instagram (ate 2200 chars) — ajustar conforme recommendedChannel do tema
```

## Pre-requisitos

- Inbound Forge rodando localmente (npm run dev)
- Temas com status ACTIVE no banco
- Ao menos 1 dor ou case por tema
