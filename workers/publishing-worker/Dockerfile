# Publishing Worker — Inbound Forge (implementacao real)
#
# Build context = REPO ROOT. O railway.toml deste worker aponta
# dockerfilePath = "workers/publishing-worker/Dockerfile" (convencao do
# scraping-worker), entao os COPY usam caminhos relativos a raiz.
# O schema Prisma canonico vive em /prisma (fonte unica).
#
# Substitui o stub anterior em apps/publishing-worker (REMOVIDO), que marcava a
# fila como DONE/PUBLISHED com o publish comentado, publicando nada — finding
# WK-WRK-02. Esta imagem roda dist/index.js, que dispatcha por canal via
# publisher.ts (BLOG/INSTAGRAM auto, LINKEDIN/TIKTOK/YOUTUBE assistido), com
# retry/backoff e atualizacao atomica de PublishingQueue + Post.

# ─── Stage 1: builder ─────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY workers/publishing-worker/package.json workers/publishing-worker/package-lock.json ./
RUN npm ci

COPY workers/publishing-worker/tsconfig.json ./
COPY workers/publishing-worker/src ./src
COPY prisma ./prisma

RUN npx prisma generate
RUN npm run build

# ─── Stage 2: runtime ─────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup -S workers && adduser -S worker -G workers

COPY --from=builder --chown=worker:workers /app/dist ./dist
COPY --from=builder --chown=worker:workers /app/node_modules ./node_modules
COPY --from=builder --chown=worker:workers /app/package.json ./
COPY --from=builder --chown=worker:workers /app/prisma ./prisma

USER worker

EXPOSE 3002

CMD ["node", "dist/index.js"]
