# Dockerfile multi-stage — Inbound Forge Workers (Railway)
# Criado por: auto-flow execute (module-1/TASK-3/ST004)
# Referência: railway-deploy-hardening blueprint

# ─── Stage 1: Dependencies ───────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# ─── Stage 2: Builder ────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Gerar Prisma Client
RUN npx prisma generate
# Compilar TypeScript
RUN npx tsc --outDir dist --skipLibCheck

# ─── Stage 3: Runner (imagem final mínima) ───────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copiar apenas artefatos compilados (não source)
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json

# Criar usuário não-root para segurança
RUN addgroup -S workers && adduser -S worker -G workers
USER worker

# Health check: verifica se o processo worker está rodando
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -q -O- "http://localhost:${PORT:-3001}/health" || exit 1

# Porta padrão dos workers
EXPOSE 3001

CMD ["node", "dist/workers/index.js"]
