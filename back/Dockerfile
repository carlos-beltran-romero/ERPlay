# syntax=docker/dockerfile:1

FROM node:20-slim AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS builder
COPY tsconfig.json tsconfig.jest.json ./
COPY openapi.yaml ./openapi.yaml
COPY erplay.sql ./erplay.sql
COPY uploads ./uploads
COPY src ./src
RUN npm run build

FROM base AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
RUN npm prune --omit=dev
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/openapi.yaml ./openapi.yaml
COPY --from=builder /app/erplay.sql ./erplay.sql
COPY --from=builder /app/uploads ./uploads
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN apt-get update \
  && apt-get install -y --no-install-recommends netcat-openbsd \
  && rm -rf /var/lib/apt/lists/* \
  && chmod +x docker-entrypoint.sh
EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
