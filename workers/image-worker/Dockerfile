# Stage 1: builder
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies for sharp and resvg native binaries
RUN apk add --no-cache python3 make g++ cairo-dev pango-dev

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: runtime
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Runtime deps for sharp/resvg
RUN apk add --no-cache cairo pango

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json .
COPY --from=builder /app/fonts ./fonts

CMD ["node", "dist/index.js"]
