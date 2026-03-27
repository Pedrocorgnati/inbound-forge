# Inbound Forge

Plataforma de inbound marketing com IA para geração, publicação e rastreamento de conteúdo B2B.

## Stack

- **Frontend:** Next.js 14+ (App Router) · TypeScript · Tailwind CSS
- **Backend:** Next.js API Routes · Prisma ORM · Zod validation
- **Database:** PostgreSQL via Supabase
- **Cache/Filas:** Upstash Redis
- **Workers:** Railway (Docker) — Scraping, Image, Publishing
- **Deploy:** Vercel (frontend) · Railway (workers)
- **Auth:** Supabase Auth

## Setup

```bash
# 1. Clonar e instalar
git clone git@github.com:Pedrocorgnati/inbound-forge.git
cd inbound-forge
npm install

# 2. Configurar env vars
cp .env.example .env.local
# Preencher valores no .env.local

# 3. Gerar Prisma Client e aplicar migrations
npx prisma generate
npx prisma migrate deploy

# 4. Seed de desenvolvimento
npx prisma db seed

# 5. Iniciar dev server
npm run dev
```

## Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Dev server (localhost:3000) |
| `npm run build` | Build de produção |
| `npm run lint` | ESLint |
| `npm run type-check` | TypeScript strict check |
| `npx prisma studio` | UI para visualizar banco |
| `npx prisma db seed` | Seed de desenvolvimento |
| `SEED_ENV=test npx prisma db seed` | Seed de testes (fixtures) |

## Estrutura

```
src/
├── app/              # App Router pages e API routes
├── components/       # React components (ui, layout, shared, auth)
├── lib/              # Singletons (prisma, redis, supabase, worker-client)
├── schemas/          # Zod validation schemas
├── services/         # Business logic services
├── actions/          # Server actions
├── hooks/            # Custom React hooks
├── constants/        # Enums, routes, errors
└── types/            # TypeScript type definitions
prisma/
├── schema.prisma     # 15 enums + 25 entidades + 2 pivot tables
├── migrations/       # Database migrations
└── seeds/            # Seeds (dev, test, prod)
workers/
├── Dockerfile        # Multi-stage Docker para Railway
└── docker-compose.yml
```

## Backup

```bash
./scripts/backup.sh           # Backup manual (antes de migrations prod)
```

Backup automático: Supabase diário (7 dias de retenção).

## Próximos Passos

Ver [docs/POST-MVP-ROADMAP.md](./docs/POST-MVP-ROADMAP.md) para features e melhorias planejadas pós-MVP (Q3/Q4 2026).
