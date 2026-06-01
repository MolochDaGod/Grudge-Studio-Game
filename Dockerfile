# ── Stage 1: Build ────────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# Copy workspace root configs
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY .npmrc* ./
COPY tsconfig.base.json ./

# Copy all workspace packages (needed for monorepo resolution)
COPY lib/ lib/
COPY artifacts/grudge-studio-game/ artifacts/grudge-studio-game/

# Install dependencies (--ignore-scripts avoids pnpm v10 build blocking)
RUN pnpm install --no-frozen-lockfile --ignore-scripts

# Build the grudge-studio-game
RUN pnpm --filter @workspace/grudge-studio-game run build

# ── Stage 2: Run ──────────────────────────────────────────────────────────────────
FROM node:22-alpine AS production

RUN apk add --no-cache nginx

WORKDIR /app
COPY --from=builder /app/artifacts/grudge-studio-game/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
