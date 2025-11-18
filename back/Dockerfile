# syntax=docker/dockerfile:1

FROM node:20-slim AS base
WORKDIR /app

# ---- deps ----
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# ---- build ----
FROM deps AS builder
COPY tsconfig.json tsconfig.jest.json ./
COPY openapi.yaml ./openapi.yaml
COPY erplay.sql ./erplay.sql
COPY uploads ./uploads
COPY src ./src
RUN npm run build

# ---- runtime ----
FROM base AS runtime
ENV NODE_ENV=production
WORKDIR /app

# Paquetes del sistema (nc para wait_for_db + cliente MySQL para erplay.sql)
RUN apt-get update \
  && apt-get install -y --no-install-recommends netcat-openbsd default-mysql-client \
  && rm -rf /var/lib/apt/lists/*

# Dependencias Node (solo runtime)
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
RUN npm prune --omit=dev

# App compilada + SQL + uploads
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/openapi.yaml ./openapi.yaml
COPY --from=builder /app/erplay.sql ./erplay.sql
COPY --from=builder /app/uploads ./uploads

# Entrypoint
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN sed -i 's/\r$//' docker-entrypoint.sh && chmod +x docker-entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
