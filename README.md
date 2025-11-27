# ERPlay

Plataforma educativa para practicar diagramas entidad–relación. El repositorio incluye una API REST en Express + TypeORM, un frontend React con Vite y tooling para documentación, calidad estática y despliegue con Docker.

## Requisitos previos

- Node.js 20+ y npm 10+
- MySQL 8 (solo si se ejecuta la API fuera de Docker)
- Docker y Docker Compose (opcional, recomendados para el entorno completo)
- SonarQube Community Edition en local para los análisis de calidad

## Estructura del repositorio

```
ERPlay/
├── back/               # API REST (Express + TypeORM)
├── front/              # Aplicación React + Vite
├── docs/               # Documentación HTML generada con TypeDoc
├── docker-compose.yml  # Orquestación de frontend, backend y MySQL
├── typedoc.json        # Configuración de la documentación técnica
└── sonar-project.properties
```

## Puesta en marcha local (sin Docker)

### Backend
1. Instala dependencias:
   ```bash
   cd back
   npm install
   ```
2. Copia y ajusta `.env` siguiendo el esquema de `src/config/env.ts`.
3. Ejecuta migraciones con MySQL levantado:
   ```bash
   npm run migration:run
   ```
4. (Opcional) Carga datos de ejemplo:
   ```bash
   npm run seed
   ```
5. Levanta la API en modo desarrollo:
   ```bash
   npm run dev
   ```

### Frontend
1. Instala dependencias:
   ```bash
   cd front
   npm install
   ```
2. Define `VITE_API_URL` en un `.env.local` (p. ej. `http://localhost:3000/api`).
3. Inicia el servidor de desarrollo de Vite:
   ```bash
   npm run dev
   ```

## Docker

El `docker-compose.yml` levanta MySQL, API y frontend con Nginx.

- Construir y arrancar (se aplica la semilla según `RUN_DB_SEED`):
  ```bash
  RUN_DB_SEED=true docker compose up --build
  ```
  En PowerShell:
  ```powershell
  $env:RUN_DB_SEED="true"; docker compose up --build
  ```
- Detener y limpiar volúmenes persistentes (incluye base de datos y uploads):
  ```bash
  docker compose down -v
  ```

Variables principales ya definidas en el `compose`:
- `RUN_DB_SEED`: controla si se ejecuta la semilla inicial (`back/src/seeds/seed.ts`).
- `MYSQL_*`: credenciales de la base de datos.
- `JWT_*` y `SMTP_*`: secretos para autenticación y correo.

Al terminar el build, el frontend queda en `http://localhost:8080`, la API en `http://localhost:3000/api` y MySQL expuesto en `localhost:3306`. Los ficheros subidos se guardan en el volumen `back_uploads`.

## Documentación

- **API**: Swagger UI servido por el backend en `http://localhost:3000/api/docs` y contrato disponible en `back/openapi.yaml`.
- **Documentación HTML técnica**: generada con TypeDoc para frontend y backend en `/docs/index.html`.
  - Generar/actualizar: `npm run docs`
  - Servir localmente: `npm run docs:serve` (abre un servidor estático sobre `docs/`)

## Calidad y análisis estático

Se usa SonarQube Community Edition en local (`http://localhost:9000`). Arranca el servidor de SonarQube y crea un token de proyecto antes de lanzar el análisis.

- Analizar el monorepo (front + back):
  ```bash
  SONAR_HOST_URL=http://localhost:9000 SONAR_TOKEN=<tu_token> npm run sonar
  ```
  El script espera que el servidor esté accesible y tomará la configuración de `sonar-project.properties`.

## Scripts útiles

### Backend (`back/`)
- `npm run dev`: API en desarrollo con recarga.
- `npm run build`: compila a `dist/`.
- `npm start`: ejecuta la versión compilada.
- `npm test`: suite de Jest + Supertest.
- `npm run seed` / `npm run seed:prod`: poblar datos en desarrollo o desde build compilado.
- `npm run migration:run` / `npm run migration:revert`: aplicar o revertir migraciones.

### Frontend (`front/`)
- `npm run dev`: servidor de desarrollo Vite.
- `npm run build`: build de producción.
- `npm run lint`: linting con ESLint.
- `npm run preview`: previsualizar la build.

### Raíz
- `npm run docs`: genera documentación TypeDoc en `docs/`.
- `npm run docs:serve`: sirve la documentación HTML.
- `npm run sonar`: lanza el análisis SonarQube (requiere `SONAR_HOST_URL` y `SONAR_TOKEN`).

## Notas

- El endpoint de salud está disponible en `GET /health` y los ficheros subidos se exponen en `/uploads`.
- El reverse proxy de Nginx en Docker reenvía `/api/*` del frontend al backend, evitando configuraciones adicionales de CORS.
