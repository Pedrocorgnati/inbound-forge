# Publishing Worker Dockerfile — Inbound Forge
# TASK-9 ST002 / CL-155 (pos-MVP)
# Multi-stage: build TypeScript -> runtime node:20-alpine

FROM node:20-alpine AS builder
WORKDIR /app

# Instalar dependencias do workspace raiz
COPY package.json package-lock.json ./
COPY apps/publishing-worker/package.json ./apps/publishing-worker/
RUN npm ci --workspace=apps/publishing-worker

COPY apps/publishing-worker ./apps/publishing-worker
COPY prisma ./prisma

RUN npx prisma generate
RUN npm run build --workspace=apps/publishing-worker

# ── Runtime ─────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/apps/publishing-worker/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:8080/ || exit 1

CMD ["node", "dist/main.js"]
