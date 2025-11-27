# Arquitectura del back-end

## Visión general

La API de ERPlay está construida en **Node.js 20**, **Express 5** y **TypeORM** sobre MySQL. La solución se organiza por capas para aislar infraestructura, dominio y delivery HTTP:

- **Configuración (`src/config/`)**: validación estricta de variables con Zod y carga de `.env`.
- **Núcleo (`src/core/`)**: utilidades compartidas (p. ej. estilos de Swagger UI) y bootstrap transversal.
- **Aplicación (`src/app.ts`, `src/server.ts`)**: factoría `createApp` con middlewares comunes y exportación de la instancia para pruebas.
- **Rutas (`src/routes/`)**: composición del router `/api`, documentación Swagger y registro de módulos.
- **Controladores (`src/controllers/`)**: adaptadores HTTP que orquestan servicios y validan DTOs.
- **Servicios (`src/services/`)**: lógica de negocio y coordinación con repositorios TypeORM.
- **Modelos (`src/models/`)**: entidades y relaciones persistentes.
- **Middlewares (`src/middlewares/`)**: autenticación, autorización, validación, logging y manejo de errores/cargas.
- **Infraestructura de datos (`src/data-source.ts`, `src/migrations/`, `src/seeds/`)**: inicialización de TypeORM, migraciones versionadas y seeds.

## Flujo de petición

1. `createApp()` aplica `helmet`, `cors`, logging y parseadores de JSON/URL-encoded; expone un `GET /health` y los assets estáticos de `/uploads` antes de montar las rutas de negocio.【F:back/src/app.ts†L17-L44】
2. `registerRoutes()` construye el router `/api`, sirve Swagger UI sin depender de CDN, publica el contrato en `/api/openapi.yaml` y agrega los módulos de dominio (auth, users, diagrams, questions, progress, supervisor, etc.).【F:back/src/routes/index.ts†L23-L87】
3. Los controladores transforman la petición en llamadas a servicios. Los servicios encapsulan las reglas de negocio y manipulan las entidades de TypeORM.
4. Los errores pasan por `uploadErrorHandler`, `notFound` y `errorHandler`, devolviendo respuestas homogéneas.

## Configuración y arranque

- `src/config/env.ts` valida todas las variables críticas (DB, JWT, SMTP, URLs públicas) y aborta el arranque si falta alguna, aplicando valores por defecto seguros donde procede.【F:back/src/config/env.ts†L10-L52】
- `src/index.ts` inicializa el `AppDataSource` y, tras conectarse a MySQL, importa `server.ts` para levantar el HTTP server en el puerto configurado.【F:back/src/index.ts†L1-L15】
- `src/server.ts` exporta la instancia Express creada por `createApp`, permitiendo reutilizarla en tests o adaptarla a otros despliegues.

## Persistencia

- El `AppDataSource` definido en `src/data-source.ts` centraliza la conexión MySQL y registra entidades/migraciones.
- Las migraciones viven en `src/migrations/` y se ejecutan con los scripts `migration:run`/`migration:revert` desde TypeScript o compiladas (`:js`).
- Las semillas (`src/seeds/seed.ts`) cargan usuarios, diagramas, preguntas, exámenes, progreso y métricas iniciales; el `docker-compose` permite habilitarlas con `RUN_DB_SEED` en arranque.【F:docker-compose.yml†L34-L48】【F:back/src/seeds/seed.ts†L1-L209】

## Middlewares y seguridad

- `middlewares/authenticate` y `middlewares/authorize` protegen rutas por rol, mientras que `validateDto` homogeniza la validación de payloads.
- `middlewares/logger` traza cada petición; `upload` y `uploadErrorHandler` gestionan las cargas de archivos y sus errores.
- Los JWT de acceso, refresco y reseteo se configuran mediante `JWT_SECRET`, `JWT_REFRESH_SECRET` y `JWT_RESET_SECRET` validados en `env.ts`.

## Documentación y contratos

- Swagger UI está disponible en `GET /api/docs`, alimentado por `back/openapi.yaml` y servido desde los assets locales de `swagger-ui-dist` para evitar dependencias externas.【F:back/src/routes/index.ts†L26-L68】【F:back/openapi.yaml†L1-L34】
- La documentación técnica de TypeDoc (front y back) se genera en la carpeta raíz `docs/` y enlaza con el README principal (`typedoc.json`).

## Pruebas y salud

- La API expone `GET /health` como verificación básica del servicio.【F:back/src/app.ts†L37-L44】
- La suite de Jest + Supertest cubre los flujos de autenticación usando repositorios en memoria y puede ejecutarse con `npm test` desde `back/`.
