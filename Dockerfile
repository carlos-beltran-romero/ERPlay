# ---------- Backend development ----------
FROM node:20 AS backend-dev
WORKDIR /app/back
COPY back/package*.json ./
RUN npm install
COPY back .
CMD ["npm", "run", "dev"]

# ---------- Backend build ----------
FROM node:20 AS backend-build
WORKDIR /app/back
COPY back/package*.json ./
RUN npm install
COPY back .
RUN npm run build
RUN mkdir -p /app/back/uploads/diagrams

# ---------- Backend production ----------
FROM node:20-alpine AS backend-prod
WORKDIR /app/back
ENV NODE_ENV=production
COPY back/package*.json ./
RUN npm install --omit=dev
COPY --from=backend-build /app/back/dist ./dist
COPY --from=backend-build /app/back/uploads ./uploads
COPY back/.env.example ./
CMD ["node", "dist/index.js"]

# ---------- Frontend development ----------
FROM node:20 AS frontend-dev
WORKDIR /app/front
COPY front/package*.json ./
RUN npm install
COPY front .
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# ---------- Frontend build ----------
FROM node:20 AS frontend-build
WORKDIR /app/front
COPY front/package*.json ./
RUN npm install
COPY front .
RUN npm run build

# ---------- Frontend production ----------
FROM nginx:1.27-alpine AS frontend-prod
COPY --from=frontend-build /app/front/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK CMD wget -qO- http://127.0.0.1/ || exit 1
