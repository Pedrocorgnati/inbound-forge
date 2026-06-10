# Scraping Worker — Inbound Forge
# TASK-1 ST001: Dockerfile multi-stage com Playwright (Chromium do sistema).
# OWASP A05: usuário não-root, imagem mínima, sem secrets hardcoded.
#
# Onda3 fix: Build context = REPO ROOT (railway.toml aponta
# dockerfilePath="workers/scraping-worker/Dockerfile" sem rootDirectory — mesma
# convenção dos outros 3 workers). Os COPY abaixo são relativos à raiz. O schema
# Prisma canônico vive em /prisma (fonte única); `npx prisma generate` roda ANTES
# de `npm run build` (tsc precisa do @prisma/client gerado — antes o generate
# estava no stage runner, depois do build, e o tsc do builder quebrava).

# ─── Stage 1: base Alpine com Chromium ────────────────────────────────────────
FROM node:20-alpine AS base
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

# ─── Stage 2: builder (deps completas + prisma generate + tsc) ─────────────────
FROM base AS builder
# scraping-worker não mantém package-lock próprio versionado; npm install resolve
# (o glob torna o lock opcional). --ignore-scripts evita postinstall/browser-download.
COPY workers/scraping-worker/package.json workers/scraping-worker/package-lock.json* ./
RUN npm install --ignore-scripts
COPY workers/scraping-worker/tsconfig.json ./
COPY workers/scraping-worker/src ./src
COPY prisma ./prisma
# Gerar o client ANTES do build — tsc depende dos tipos do @prisma/client.
RUN npx prisma generate
RUN npm run build

# ─── Stage 3: runtime final (non-root) ─────────────────────────────────────────
FROM base AS runner
RUN addgroup --system --gid 1001 scraper && \
    adduser --system --uid 1001 --ingroup scraper scraper

# Copiar node_modules do builder (inclui @prisma/client já gerado), dist e schema.
COPY --from=builder --chown=scraper:scraper /app/node_modules ./node_modules
COPY --from=builder --chown=scraper:scraper /app/dist ./dist
COPY --from=builder --chown=scraper:scraper /app/package.json ./
COPY --from=builder --chown=scraper:scraper /app/prisma ./prisma

EXPOSE 3001
USER scraper
CMD ["node", "dist/index.js"]
