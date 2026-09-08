# syntax=docker/dockerfile:1
#
# Build (NEXT_PUBLIC_* are build ARGs, not compose env — see stage 2 below;
# docker-compose.yaml / compose.env.example never mention them):
#
#   docker build \
#     --build-arg NEXT_PUBLIC_API_URL=https://api.raqeem-edu.com/api \
#     --build-arg NEXT_PUBLIC_USE_MOCK_AUTH=false \
#     -t raqeem-frontend:latest .
#
# NEXT_PUBLIC_API_URL must include the trailing /api — every apiClient call
# (src/lib/api/*.ts) is written as a bare path like "/register", not
# "/api/register". A build without it (as this comment itself wrongly showed
# before) bakes in a base URL missing /api, so every request 404s in
# production with no CORS headers on the response (config/cors.php's
# 'paths' => ['api/*', ...] doesn't match the un-prefixed path either) —
# indistinguishable from a CORS failure in the browser's Network tab.
#
# Then `docker compose up -d` (docker-compose.yaml just runs the image this
# built, via ${IMAGE_NAME}:${APP_VERSION}).

# =============================================================================
# Stage 1/3 — dependencies. Cached separately from source so a source-only
# change doesn't force a full npm reinstall.
# =============================================================================
FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci


# =============================================================================
# Stage 2/3 — build. NEXT_PUBLIC_* values are baked into the compiled output
# at this exact step (verified locally: they end up as literal strings in
# .next/server/chunks/**, not read at container start) — so they arrive here
# as build ARGs, not as docker-compose `environment:`/`env_file:` entries,
# which would only reach the *runner* stage's process environment and do
# nothing (the code that reads them no longer exists by then — Next's
# compiler resolves and dead-code-eliminates the `process.env.NEXT_PUBLIC_*`
# checks at build time). Confirmed locally: with
# NEXT_PUBLIC_USE_MOCK_AUTH=false at build time, the `if (USE_MOCK) return
# mock...` branch in src/lib/server/parentLaravel.ts is gone from the
# compiled chunk entirely — only the real `fetch(...)` call remains.
# =============================================================================
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_USE_MOCK_AUTH
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_USE_MOCK_AUTH=${NEXT_PUBLIC_USE_MOCK_AUTH}

RUN npm run build


# =============================================================================
# Stage 3/3 — runtime image. `output: "standalone"` (next.config.ts) traces
# only the files server.js actually needs and copies them (plus a pruned
# node_modules) into .next/standalone — no full node_modules, no build
# toolchain, no source tree in the final image. Two things standalone does
# NOT copy on its own (both required at runtime, confirmed by running
# server.js locally without them first and seeing it fail to serve assets):
# public/ and .next/static/ — copied in explicitly below.
# =============================================================================
FROM node:20-alpine AS runner
WORKDIR /app

# curl only — needed for the HEALTHCHECK below (alpine ships neither by
# default, same reason raqeem-api's Dockerfile installs it explicitly).
RUN apk add --no-cache curl

ENV NODE_ENV=production
# Next.js reads PORT directly (confirmed empirically: running server.js
# locally with no PORT set, it bound 0.0.0.0:3000 by default and printed
# that as both "Local" and "Network" in its startup banner).
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# COPY runs as root regardless of a later USER instruction, so ownership
# needs an explicit fix here — same lesson as raqeem-api's Dockerfile
# (chown alone doesn't guarantee read bits survived COPY, hence chmod too).
RUN chown -R node:node /app && chmod -R u=rwX,go=rX /app

# node:20-alpine ships a non-root `node` user (uid 1000) out of the box —
# no need to create one.
USER node

EXPOSE 3000

# No dedicated health route exists in this Next.js app (unlike raqeem-api's
# Laravel /up). Confirmed locally instead: GET / returns 307 (next-intl's
# locale redirect) when the app is actually up, and curl -fsS treats a 307
# as success (only -f-triggering codes are >=400) — so this reports "down"
# correctly (curl fails outright) without needing the app to expose a
# separate health endpoint it doesn't have.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -fsS http://127.0.0.1:3000/ || exit 1

CMD ["node", "server.js"]
