# syntax=docker/dockerfile:1

    FROM node:20-slim AS deps
    WORKDIR /app
    COPY package*.json ./
    RUN npm ci
    

    FROM node:20-slim AS build
    WORKDIR /app
    COPY package*.json ./
    COPY --from=deps /app/node_modules ./node_modules
    COPY tsconfig.json ./
    COPY src ./src
    RUN npm run build
    

    FROM node:20-slim AS production
    WORKDIR /app
    ENV NODE_ENV=production
    
    COPY package*.json ./
    RUN npm ci --omit=dev && npm cache clean --force
    

    COPY --from=build /app/dist ./dist
    
    EXPOSE 3000
    CMD ["node", "dist/index.js"]
    