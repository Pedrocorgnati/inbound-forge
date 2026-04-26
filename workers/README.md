# Inbound Forge Workers

Três workers independentes que rodam fora do Next.js para processamento pesado.

## Arquitetura

```
Next.js (Vercel)
    ↓ job enqueue via Redis
┌─────────────────────────────┐
│  Railway (3 workers)        │
│  ┌─────────────────────┐    │
│  │  scraping-worker    │ ←→ Firecrawl, Claude API  │
│  ├─────────────────────┤    │
│  │  image-worker       │ ←→ Ideogram, Flux (fal.ai)│
│  ├─────────────────────┤    │
│  │  publishing-worker  │ ←→ Instagram Graph API    │
│  └─────────────────────┘    │
└─────────────────────────────┘
```

## Deploy no Railway

### Pré-requisitos

1. Conta Railway com projeto criado
2. Variáveis de ambiente configuradas (ver `railway.toml`)
3. Redis provisionado no Railway

### Deploy inicial

```bash
# Instalar Railway CLI
npm install -g @railway/cli

# Login
railway login

# Deploy de um worker específico
railway up --service inbound-forge-scraping-worker
railway up --service inbound-forge-image-worker
railway up --service inbound-forge-publishing-worker
```

### Healthcheck

Cada worker expõe `GET /health` na porta 3001 (scraping), 3002 (image), 3003 (publishing).

```bash
curl https://<worker-url>.railway.app/health
# { "status": "ok", "uptime": 12345, "queues": { ... } }
```

## Desenvolvimento Local

```bash
# Subir todos os workers com docker-compose
cd workers
docker-compose up

# Subir worker específico
docker-compose up scraping-worker
```

## Variáveis de Ambiente

| Variável | Workers | Descrição |
|----------|---------|-----------|
| `REDIS_URL` | Todos | URL do Redis (Railway ou Upstash) |
| `DATABASE_URL` | Todos | PostgreSQL (Supabase) |
| `WORKER_TOKEN` | Todos | Token de autenticação entre Next.js e workers |
| `ANTHROPIC_API_KEY` | scraping | Claude API para análise de conteúdo |
| `IDEOGRAM_API_KEY` | image | Geração de imagens com texto |
| `FAL_API_KEY` | image | Flux 2 Schnell para backgrounds |
| `INSTAGRAM_ACCESS_TOKEN` | publishing | Token Graph API |

## Custos Estimados (Railway)

| Worker | RAM | CPU | Custo/mês |
|--------|-----|-----|-----------|
| scraping | 512MB | 0.5 | ~$5 |
| image | 1GB | 1.0 | ~$10 |
| publishing | 256MB | 0.25 | ~$3 |
| **Total** | | | **~$18** |

Custo total do sistema: $18 (Railway) + $5 (Vercel) + variável (APIs) ≈ $20-35/mês.
