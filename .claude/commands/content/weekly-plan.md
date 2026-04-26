# /content:weekly-plan — Plano semanal de conteudo

Mostra o estado do pipeline de conteudo e sugere proximas acoes.

## Uso

```
/content:weekly-plan
```

## Fluxo

```
1. Conectar ao banco via API local do Inbound Forge (localhost:3000)

2. Coletar metricas:
   a. GET /api/v1/themes?limit=10&sortBy=score&sortOrder=desc
      → Top 10 temas por score
   b. GET /api/v1/content?status=DRAFT
      → ContentPieces em DRAFT (aguardando revisao)
   c. GET /api/posts?status=DRAFT
      → Posts em DRAFT
   d. GET /api/posts?status=SCHEDULED
      → Posts agendados
   e. GET /api/posts?status=PUBLISHED&limit=5
      → Ultimos 5 posts publicados

3. Exibir dashboard resumido:

   PIPELINE DE CONTEUDO — SEMANA DE {data}
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   
   TOP 5 TEMAS (por score):
   1. {title} — Score: {score} — {status}
   2. ...
   
   ESTADO DO PIPELINE:
   - ContentPieces em DRAFT: {N} (aguardando angulos ou revisao)
   - Posts em DRAFT: {N} (aguardando aprovacao)
   - Posts SCHEDULED: {N} (agendados para publicacao)
   - Posts publicados esta semana: {N}
   
   SUGESTOES:
   - SE DRAFT > 0: "Revise {N} ContentPieces no dashboard"
   - SE temas sem ContentPiece: "Gere angulos para {N} temas: /content:generate-angles {N}"
   - SE SCHEDULED < 5: "Agende mais posts para manter frequencia"
   - SE publicados < 3 na semana: "Considere aumentar cadencia de publicacao"
   
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

4. Perguntar: "Quer que eu gere angulos para os temas pendentes?"
```

## Pre-requisitos

- Inbound Forge rodando localmente (npm run dev)
