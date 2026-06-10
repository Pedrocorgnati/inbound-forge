# Inbound Forge Workers

Quatro workers independentes que rodam fora do Next.js para processamento pesado.

## Arquitetura

```
Next.js (Vercel)
    ↓ job enqueue via Upstash Redis
┌─────────────────────────────┐
│  Railway (4 workers)        │
│  ┌─────────────────────┐    │
│  │  scraping-worker    │ ←→ Firecrawl, Claude API  │
│  ├─────────────────────┤    │
│  │  image-worker       │ ←→ Ideogram, Flux (fal.ai)│
│  ├─────────────────────┤    │
│  │  video-worker       │ ←→ Replicate / Short Video Maker │
│  ├─────────────────────┤    │
│  │  publishing-worker  │ ←→ Instagram Graph API    │
│  └─────────────────────┘    │
└─────────────────────────────┘
```

Cada worker e um service Railway independente, com seu proprio `railway.toml`
(`workers/<worker>/railway.toml`) — NAO existe mais um agregado em `workers/railway.toml`.

## Deploy no Railway

### Pré-requisitos

1. Conta Railway com projeto criado
2. Variáveis de ambiente configuradas (ver o `railway.toml` de cada worker: `workers/<worker>/railway.toml`)
3. Upstash Redis provisionado (REST API)

### Deploy inicial

```bash
# Instalar Railway CLI
npm install -g @railway/cli

# Login
railway login

# Deploy de um worker específico (de dentro do diretorio do worker)
cd workers/scraping-worker   && railway up --service inbound-forge-scraping-worker
cd workers/image-worker      && railway up --service inbound-forge-image-worker
cd workers/video-worker      && railway up --service inbound-forge-video-worker
cd workers/publishing-worker && railway up --service inbound-forge-publishing-worker
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
| `UPSTASH_REDIS_REST_URL` | Todos | URL REST do Upstash Redis |
| `UPSTASH_REDIS_REST_TOKEN` | Todos | Token REST do Upstash Redis |
| `DATABASE_URL` | Todos | PostgreSQL (Supabase) |
| `WORKER_AUTH_TOKEN` | Todos | Token de autenticação entre Next.js e workers |
| `NEXT_PUBLIC_SUPABASE_URL` | image, video | URL do projeto Supabase (Storage) |
| `SUPABASE_SERVICE_ROLE_KEY` | image, video | Service role key (upload no Storage) |
| `ANTHROPIC_API_KEY` | scraping | Claude API para análise de conteúdo |
| `IDEOGRAM_API_KEY` | image | Geração de imagens com texto |
| `FAL_API_KEY` | image | Flux 2 Schnell para backgrounds |
| `REPLICATE_API_TOKEN` | video | Short Video Maker (Replicate) |
| `INSTAGRAM_ACCESS_TOKEN` | publishing | Token Graph API |

## Custos Estimados (Railway)

| Worker | RAM | CPU | Custo/mês |
|--------|-----|-----|-----------|
| scraping | 512MB | 0.5 | ~$5 |
| image | 1GB | 1.0 | ~$10 |
| publishing | 256MB | 0.25 | ~$3 |
| **Total** | | | **~$18** |

Custo total do sistema: $18 (Railway) + $5 (Vercel) + variável (APIs) ≈ $20-35/mês.
