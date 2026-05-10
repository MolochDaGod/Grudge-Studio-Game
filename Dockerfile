# ── Stage 1: Build ────────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# Copy workspace root configs
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY .npmrc* ./

# Copy workspace packages needed for api-server
COPY lib/ lib/
COPY artifacts/api-server/ artifacts/api-server/

# Install dependencies (--ignore-scripts avoids pnpm v10 build blocking)
RUN pnpm install --no-frozen-lockfile --ignore-scripts

# Build the api-server
RUN pnpm --filter @workspace/api-server run build

# ── Stage 2: Run ──────────────────────────────────────────────────────────────────
FROM node:22-alpine AS production

WORKDIR /app
COPY --from=builder /app/artifacts/api-server/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "dist/index.cjs"]
