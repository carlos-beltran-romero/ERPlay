# ERPlay

Plataforma educativa para **practicar diagramas Entidad–Relación (ER)** mediante tests (modo **Examen** / **Aprendizaje**), seguimiento de progreso y gestión de contenido.  
Repositorio **monorepo** con **API REST (Express + TypeORM)**, **frontend (React + Vite)**, documentación técnica y tooling de calidad, preparado para ejecución local y despliegue con Docker.

---

## Índice

- [Stack](#stack)
- [Estructura del repositorio](#estructura-del-repositorio)
- [Requisitos previos](#requisitos-previos)
- [Arranque rápido con Docker (recomendado)](#arranque-rápido-con-docker-recomendado)
- [Puesta en marcha local (sin Docker)](#puesta-en-marcha-local-sin-docker)
- [Variables de entorno](#variables-de-entorno)
- [Migraciones y seed](#migraciones-y-seed)
- [Documentación](#documentación)
- [Calidad y análisis estático (SonarQube)](#calidad-y-análisis-estático-sonarqube)
- [Despliegue (producción)](#despliegue-producción)
- [Notas](#notas)

---

## Stack

**Backend**
- Node.js + Express
- TypeORM
- MySQL
- JWT (autenticación)
- SMTP (envío de emails)

**Frontend**
- React + Vite
- UI responsive (modo claro/oscuro)

**Tooling**
- Docker / Docker Compose
- TypeDoc
- SonarQube (Community Edition)

---

## Estructura del repositorio

```txt
ERPlay/
├── back/               # API REST (Express + TypeORM)
├── front/              # Frontend (React + Vite)
├── docs/               # Documentación HTML generada con TypeDoc
├── docker-compose.yml  # Orquestación: frontend, backend y MySQL
├── typedoc.json        # Configuración TypeDoc
└── sonar-project.properties
```

---

## Requisitos previos

- Node.js **20+** y npm **10+**
- Docker y Docker Compose *(opcional, recomendado para levantar todo el entorno)*
- MySQL 8 *(solo si ejecutas la API fuera de Docker)*
- SonarQube CE en local *(opcional, para análisis de calidad)*

---

## Arranque rápido con Docker (recomendado)

Levanta MySQL + API + frontend en un solo comando:

```bash
docker compose up --build
```

Si quieres ejecutar seed automáticamente al arrancar:

```bash
RUN_DB_SEED=true docker compose up --build
```

En PowerShell:

```powershell
$env:RUN_DB_SEED="true"; docker compose up --build
```

### URLs locales (por defecto)

- Frontend: http://localhost:8080
- API: http://localhost:3000/api
- MySQL: localhost:3306

### Parar y limpiar (incluye volúmenes persistentes)

```bash
docker compose down -v
```

> En Docker, los ficheros subidos se guardan en el volumen `back_uploads`.

---

## Puesta en marcha local (sin Docker)

### Backend (Express + TypeORM)

1) Instala dependencias:

```bash
cd back
npm install
```

2) Crea tu archivo `.env` y ajústalo siguiendo el esquema esperado por `src/config/env.ts`.

3) Ejecuta migraciones (con MySQL levantado):

```bash
npm run migration:run
```

4) (Opcional) Carga datos de ejemplo:

```bash
npm run seed
```

5) Levanta la API en modo desarrollo:

```bash
npm run dev
```

API disponible en: http://localhost:3000/api

### Frontend (React + Vite)

1) Instala dependencias:

```bash
cd front
npm install
```

2) Define `VITE_API_URL` en `.env.local` (ejemplo):

```env
VITE_API_URL=http://localhost:3000/api
```

3) Inicia el servidor de desarrollo:

```bash
npm run dev
```

---

## Variables de entorno

### Backend (orientativo)

Dependiendo de tu implementación exacta en `back/src/config/env.ts`, normalmente encontrarás variables como:

**Base de datos**
- `MYSQL_HOST`
- `MYSQL_PORT`
- `MYSQL_USER`
- `MYSQL_PASSWORD`
- `MYSQL_DATABASE`

**Auth**
- `JWT_SECRET` *(y/o configuración JWT equivalente)*

**Email**
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `MAIL_FROM`

### Docker Compose

En `docker-compose.yml` ya están definidas las principales, incluyendo:

- `RUN_DB_SEED` *(controla seed inicial)*
- `MYSQL_*`
- `JWT_*`
- `SMTP_*`

---

## Migraciones y seed

### Migraciones (backend)

Aplicar:

```bash
cd back
npm run migration:run
```

Revertir:

```bash
cd back
npm run migration:revert
```

### Seed (backend)

Desarrollo:

```bash
cd back
npm run seed
```

Producción (si existe build compilada):

```bash
cd back
npm run seed:prod
```

---

## Documentación

### API (Swagger)

- Swagger UI: http://localhost:3000/api/docs
- Contrato OpenAPI: `back/openapi.yaml`

### Documentación técnica (TypeDoc)

Se genera en `docs/`.

Generar/actualizar:

```bash
npm run docs
```

Servir localmente:

```bash
npm run docs:serve
```

---

## Calidad y análisis estático (SonarQube)

SonarQube Community Edition en local (http://localhost:9000).

1) Arranca SonarQube y crea un token de proyecto.  
2) Ejecuta el análisis:

```bash
SONAR_HOST_URL=http://localhost:9000 SONAR_TOKEN=<tu_token> npm run sonar
```

El script utiliza la configuración de `sonar-project.properties`.

---

## Despliegue (producción)

### Opción A (recomendada): VPS + Docker Compose

1) Provisiona un VPS (Ubuntu recomendado) e instala Docker + Docker Compose.  
2) Clona el repositorio o despliega mediante CI/CD.  
3) Define variables de entorno para producción (DB/JWT/SMTP) o gestiona un `.env` seguro.  
4) Levanta servicios:

```bash
docker compose up -d --build
```

#### Dominio y HTTPS

Coloca un reverse proxy delante (Nginx / Caddy / Traefik) para:
- TLS con Let’s Encrypt
- redirección HTTP → HTTPS
- proxy hacia frontend y backend

### Opción B: Frontend y backend separados (PaaS)

- Frontend: Vercel / Netlify (build de Vite desde `front/`)
- Backend: Render / Fly.io / Railway
- DB: MySQL gestionado (cloud)

En este enfoque:
- `VITE_API_URL` debe apuntar a la URL pública del backend.
- Configura CORS si frontend y backend están en dominios distintos.

---

## Notas

- Endpoint de salud: `GET /health`
- Uploads servidos en: `/uploads`
- En Docker, si usas reverse proxy para `/api/*`, puedes evitar configuraciones adicionales de CORS.
