# ERPlay

Plataforma educativa para la práctica de diagramas entidad-relación con un backend Express + TypeORM en TypeScript y un frontend React con Vite. Este documento resume el flujo de trabajo local, los comandos disponibles y la nueva infraestructura de pruebas, semillas y contenedores.

## Requisitos previos

- Node.js 20+
- npm 10+
- Docker y Docker Compose (opcional, para despliegue contenedorizado)
- MySQL 8 (si se ejecuta la API sin Docker)

## Estructura del repositorio

```
ERPlay/
├── back/          # API REST con Express, TypeScript y TypeORM
├── front/         # Aplicación React + Vite
├── docker-compose.yml
└── README.md
```

## Puesta en marcha local

1. Clonar el repositorio y situarse en la carpeta del backend:
   ```bash
   cd back
   npm install
   ```
2. Configurar las variables de entorno copiando `back/.env` o creando una nueva según tus credenciales de MySQL y SMTP.
3. Ejecutar migraciones (requiere base de datos MySQL levantada):
   ```bash
   npm run migration:run
   ```
4. Inicializar datos de ejemplo (ver sección [Semilla de datos](#semilla-de-datos)):
   ```bash
   npm run seed
   ```
5. Levantar la API en modo desarrollo:
   ```bash
   npm run dev
   ```
6. Para trabajar con el frontend:
   ```bash
   cd ../front
   npm install
   npm run dev
   ```

## Pruebas automatizadas

El backend incorpora un entorno de pruebas con Jest y Supertest que valida los flujos principales de autenticación utilizando repositorios en memoria.

```bash
cd back
npm test
```

Las pruebas usan un `InMemoryRepository` que simula los repositorios de TypeORM y comprueba que el endpoint `POST /api/auth/login` responda con tokens válidos y maneje errores de credenciales.【F:back/tests/integration/auth/login.test.ts†L1-L74】【F:back/tests/utils/InMemoryRepository.ts†L1-L78】

## Semilla de datos

El script `npm run seed` inicializa la base de datos con un conjunto completo de entidades: usuarios (estudiantes y supervisores), diagramas, preguntas con opciones, valoraciones, sesiones de test, eventos, reclamaciones, objetivos semanales e insignias.【F:back/src/seeds/seed.ts†L1-L209】

Credenciales generadas por defecto:

| Rol         | Email                         | Contraseña        |
|-------------|-------------------------------|-------------------|
| Supervisor  | `maria.supervisor@erplay.com` | `Supervisor123*`  |
| Estudiante  | `ana.perez@erplay.com`        | `Alumno123*`      |
| Estudiante  | `luis.martinez@erplay.com`    | `Alumno123*`      |

## Docker

El proyecto incluye ahora una orquestación completa con Docker para frontend, backend y base de datos. Se añaden Dockerfiles independientes para cada aplicación y un `docker-compose.yml` en la raíz que coordina los tres servicios y gestiona los volúmenes persistentes.【F:front/Dockerfile†L1-L14】【F:back/Dockerfile†L1-L28】【F:docker-compose.yml†L1-L62】 El flujo recomendado es:

```bash
docker compose up --build
```

Durante el primer arranque se ejecutan automáticamente:

- Las migraciones de TypeORM, aplicadas por el backend antes de exponer la API.
- La semilla definida en `back/erplay.sql`, habilitada por defecto mediante la variable `RUN_DB_SEED`.

Servicios expuestos:

| Servicio  | URL pública              | Contenedor | Puerto interno |
|-----------|--------------------------|------------|----------------|
| Frontend  | http://localhost:8080    | `front`    | 80             |
| Backend   | http://localhost:3000    | `back`     | 3000           |
| MySQL     | `localhost:3306`         | `db`       | 3306           |

El contenedor del frontend sirve la build estática de Vite con Nginx y reenvía todas las peticiones `/api/*` al backend, de modo que no necesitas configurar CORS adicionales.【F:front/docker/nginx.conf†L1-L18】 Los archivos subidos por los usuarios se almacenan en un volumen dedicado (`back_uploads`) para conservarse entre reinicios.

### Omitir la semilla

Si prefieres arrancar con una base de datos vacía basta con desactivar la semilla en el momento de levantar los contenedores:

```bash
RUN_DB_SEED=false docker compose up --build
```

También puedes cambiar cualquier otra credencial o secreto sobreescribiendo las variables definidas en `docker-compose.yml` (por ejemplo `MYSQL_PASSWORD`, `JWT_SECRET`, etc.).

## Scripts principales del backend

| Comando                       | Descripción |
|-------------------------------|-------------|
| `npm run dev`                 | Levanta la API con `ts-node` y recarga automática.
| `npm run build`               | Compila TypeScript a JavaScript en `dist/`.
| `npm start`                   | Ejecuta la API compilada desde `dist/`.
| `npm test`                    | Corre la suite de tests con Jest + Supertest.
| `npm run seed`                | Inserta datos de prueba usando TypeORM (modo desarrollo con `ts-node`).
| `npm run seed:prod`           | Ejecuta la semilla compilada (`dist/`) para entornos productivos o Docker.
| `npm run migration:run`       | Aplica las migraciones pendientes.
| `npm run migration:revert`    | Revierte la última migración aplicada.

## Notas adicionales

- Los tokens de refresco ahora guardan su fecha de expiración en base de datos para evitar errores con columnas `NOT NULL` y facilitar auditorías.【F:back/src/services/auth.ts†L16-L120】
- `controllers/auth` permite inyectar una instancia alternativa de `AuthService`, lo que simplifica el testeo con repositorios en memoria.【F:back/src/controllers/auth.ts†L1-L77】
- Para cualquier despliegue en producción se recomienda ajustar las variables de entorno del `docker-compose.yml`, especialmente los secretos JWT y credenciales de SMTP.
