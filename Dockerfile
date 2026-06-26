# ── Stage 1: Install dependencies via npm (reliable Docker networking) ─────────
FROM node:20-slim AS deps

WORKDIR /app

COPY package.json ./

RUN npm install --legacy-peer-deps --no-audit --no-fund

# ── Stage 2: Build + Runtime using Bun ─────────────────────────────────────────
FROM oven/bun:1

WORKDIR /app

# Basic utilities + Playwright OS libraries are handled by playwright --with-deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

# Copy node_modules from the npm install stage (avoids bun registry networking)
COPY --from=deps /app/node_modules ./node_modules

# Native build tools required for sharp (image processing) bindings
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*

# ── Playwright: install Chromium + all required OS libraries ───────────────────
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
RUN ./node_modules/.bin/playwright install --with-deps chromium

# ── Source ─────────────────────────────────────────────────────────────────────
COPY . .

# ── Build ──────────────────────────────────────────────────────────────────────
# vite build  → dist/public/  (static frontend assets)
# esbuild     → dist/index.js (server bundle, packages=external so node_modules stay)
RUN bun run build

# ── Runtime ────────────────────────────────────────────────────────────────────
EXPOSE 5000
ENV NODE_ENV=production
ENV PORT=5000

# Run the esbuild-bundled server directly with Bun.
# import.meta.dirname inside dist/index.js resolves to "dist/", so
# the production static handler finds "dist/public/" correctly.
CMD ["bun", "dist/index.js"]
