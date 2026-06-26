FROM oven/bun:1

WORKDIR /app

# Basic utilities (curl for health checks; playwright install --with-deps handles
# the Chromium system libraries below)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# ── Dependency layer (cached unless package.json changes) ──────────────────────
COPY package.json bun.lock* bun.lockb* ./
RUN bun install

# Native build tools required for sharp (image processing) bindings
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*

# ── Playwright: install Chromium + all required OS libraries ───────────────────
# PLAYWRIGHT_BROWSERS_PATH keeps the browser binaries in a known location.
# playwright install --with-deps handles libnss3, libatk, libgbm, etc. automatically.
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
RUN ./node_modules/.bin/playwright install --with-deps chromium

# ── Source ─────────────────────────────────────────────────────────────────────
COPY . .

# ── Build ──────────────────────────────────────────────────────────────────────
# vite build  → dist/public/  (static frontend assets)
# esbuild     → dist/index.js (server bundle, packages=external so node_modules stay)
RUN bun run build

# ── Runtime ───────────────────────────────────────────────────────────────────
EXPOSE 5000
ENV NODE_ENV=production
ENV PORT=5000

# Run the esbuild-bundled server directly with Bun.
# import.meta.dirname inside dist/index.js resolves to "dist/", so
# the production static handler finds "dist/public/" correctly.
CMD ["bun", "dist/index.js"]
