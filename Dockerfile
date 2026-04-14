# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# Copy workspace root configs
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY .npmrc* ./

# Copy all workspace packages (needed for monorepo resolution)
COPY lib/ lib/
COPY artifacts/ artifacts/

# Install dependencies
RUN pnpm install --no-frozen-lockfile

# Build the game frontend
ARG BASE_PATH=/
ENV BASE_PATH=${BASE_PATH}
RUN pnpm --filter @workspace/grudge-studio-game run build

# ── Stage 2: Serve ────────────────────────────────────────────────────────────
FROM nginx:alpine AS production

# Copy built static files
COPY --from=builder /app/artifacts/grudge-studio-game/dist /usr/share/nginx/html

# SPA routing: all paths → index.html
COPY <<'EOF' /etc/nginx/conf.d/default.conf
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # Gzip compression for 3D assets
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/octet-stream model/gltf-binary;
    gzip_min_length 1000;

    # Cache static assets aggressively (GLB, FBX, PNG, etc.)
    location ~* \.(glb|fbx|gltf|bin|png|jpg|webp|woff2|wasm)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Cache JS/CSS with content hash
    location ~* \.(js|css)$ {
        expires 7d;
        add_header Cache-Control "public, immutable";
    }

    # SPA fallback: all routes → index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Health check endpoint
    location /health {
        return 200 'ok';
        add_header Content-Type text/plain;
    }
}
EOF

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
