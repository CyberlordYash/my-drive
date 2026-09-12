# Combined single-service build: builds the React SPA and the Express API,
# then runs ONE process that serves both from the same origin (see
# server/src/app.ts's `publicDir` static-serving block). This is the image
# to deploy as a single Render Web Service on its default *.onrender.com
# URL — no custom domain, no second service, no cross-origin cookie
# question, because everything genuinely is one origin.
#
# `server/Dockerfile` and `web/Dockerfile` still exist separately for
# docker-compose's two-container setup (which mirrors the eventual
# drive.<domain> + api.<domain> split deploy) — this file is the other,
# simpler deployment target.

# --- build the frontend ---
FROM node:24-alpine AS web-build
WORKDIR /app/web
COPY web/package.json web/package-lock.json ./
RUN npm ci
COPY web/ .
# Empty on purpose: same-origin deploy means the SPA calls /api/* as a
# relative path, resolved against whatever host it's actually served from.
ARG VITE_API_URL=
ENV VITE_API_URL=$VITE_API_URL
# This Dockerfile is specifically the "single service, local-disk storage"
# deployment target, so the ephemeral-storage notice defaults on here. Once
# S3 is wired up for this deploy, override with
# `--build-arg VITE_EPHEMERAL_STORAGE_NOTICE=false` (or just delete the arg).
ARG VITE_EPHEMERAL_STORAGE_NOTICE=true
ENV VITE_EPHEMERAL_STORAGE_NOTICE=$VITE_EPHEMERAL_STORAGE_NOTICE
RUN npm run build

# --- build the API ---
FROM node:24-alpine AS server-build
WORKDIR /app/server
COPY server/package.json server/package-lock.json ./
RUN npm ci
COPY server/ .
RUN npm run build

# --- runtime: one process, one origin ---
FROM node:24-alpine AS runtime
RUN apk add --no-cache tini
WORKDIR /app
ENV NODE_ENV=production

COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev

COPY --from=server-build /app/server/dist ./dist
COPY --from=web-build /app/web/dist ./public

RUN mkdir -p /app/data/uploads && chown -R node:node /app
VOLUME ["/app/data"]
USER node

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4000)+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/index.js"]
