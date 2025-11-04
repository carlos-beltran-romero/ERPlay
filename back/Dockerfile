# syntax=docker/dockerfile:1

FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package*.json ./
RUN npm ci

FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY tsconfig.json ./tsconfig.json
COPY src ./src
RUN npm run build

FROM base AS production
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY src ./src
COPY tsconfig.json ./tsconfig.json
COPY uploads ./uploads
EXPOSE 3000
CMD ["node", "dist/index.js"]
