# Docipy API — production image (Fastify)
# Build from repo:  docker build -t docipy-api ./server
# Run:             docker run --rm -p 3001:3001 --env-file .env docipy-api

# ── Stage 1: compile TypeScript (needs devDependencies e.g. typescript) ──
FROM node:22-bookworm-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json server.ts ./
COPY src ./src
RUN npm run build

# ── Stage 2: runtime — production deps + compiled JS + PDF worker ──
FROM node:22-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs fastify

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY workers ./workers

USER fastify

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:'+(process.env.PORT||3001)+'/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "dist/server.js"]
