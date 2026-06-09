# Video Worker — Inbound Forge
#
# Build context = REPO ROOT. O railway.toml deste worker aponta
# dockerfilePath = "workers/video-worker/Dockerfile" (mesma convencao do
# scraping-worker), entao os COPY abaixo usam caminhos relativos a raiz.
# O schema Prisma canonico vive em /prisma (fonte unica) — o worker NAO mantem
# copia propria para evitar drift. Sem `npx prisma generate`, @prisma/client
# fica como stub e quebra na 1a query (finding WK-WRK-01).

# ─── Stage 1: builder ─────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY workers/video-worker/package.json workers/video-worker/package-lock.json ./
RUN npm ci

COPY workers/video-worker/tsconfig.json ./
COPY workers/video-worker/src ./src
COPY prisma ./prisma

RUN npx prisma generate
RUN npm run build

# ─── Stage 2: runtime ─────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/prisma ./prisma

EXPOSE 3002

CMD ["node", "dist/index.js"]
