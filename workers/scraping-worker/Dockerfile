# Scraping Worker — Inbound Forge
# Target: ~250MB total (Alpine + Chromium stripped)
# TASK-1 ST001: Dockerfile multi-stage com Playwright
# OWASP A05: usuário não-root, imagem mínima, sem secrets hardcoded

# ─── Stage 1: base Alpine com Chromium ────────────────────────────────────────
FROM node:20-alpine AS base

# Chromium e dependências mínimas para Playwright
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Playwright: usar Chromium do sistema (não baixar browser separado)
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV NODE_ENV=production

WORKDIR /app

# ─── Stage 2: instalar dependências de produção ────────────────────────────────
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci --production --ignore-scripts

# ─── Stage 3: build TypeScript ────────────────────────────────────────────────
FROM base AS builder
COPY package.json package-lock.json* tsconfig.json ./
RUN npm ci --ignore-scripts
COPY src/ ./src/
RUN npm run build

# ─── Stage 4: runtime final (mínimo) ─────────────────────────────────────────
FROM base AS runner

# Criar usuário não-root (OWASP A05, T-004)
RUN addgroup --system --gid 1001 scraper && \
    adduser --system --uid 1001 --ingroup scraper scraper

# Copiar apenas o necessário
COPY --from=deps --chown=scraper:scraper /app/node_modules ./node_modules
COPY --from=builder --chown=scraper:scraper /app/dist ./dist
COPY --from=builder --chown=scraper:scraper /app/package.json ./

# Prisma schema para generate
COPY --chown=scraper:scraper prisma/ ./prisma/
RUN npx prisma generate

EXPOSE 3001

USER scraper

CMD ["node", "dist/index.js"]
