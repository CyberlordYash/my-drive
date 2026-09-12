# --- deps: install once, reused by the build stage ---
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# --- build: compile TypeScript to dist/ ---
FROM node:24-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# --- runtime: only prod deps + compiled output, non-root, tini as PID 1 ---
FROM node:24-alpine AS runtime
# tini matters: without a real init process, Node runs as PID 1 and does
# NOT forward SIGTERM to the app by default, so graceful shutdown
# (src/index.ts) never fires and a `docker stop` just hard-kills the
# process mid-request/mid-upload.
RUN apk add --no-cache tini
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist

# Local-disk storage volume — irrelevant in prod (STORAGE_DRIVER=s3 there)
# but this is also what `docker compose` uses for STORAGE_DRIVER=local.
RUN mkdir -p /app/data/uploads && chown -R node:node /app
VOLUME ["/app/data"]
USER node

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4000)+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/index.js"]
