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

Se añadió un `Dockerfile` para el backend y un `docker-compose.yml` que levanta la API y una instancia de MySQL con datos persistentes.【F:back/Dockerfile†L1-L28】【F:docker-compose.yml†L1-L43】 El comando recomendado para desarrollar con contenedores es:

```bash
docker-compose up --build
```

El servicio `api` ejecuta automáticamente las migraciones y expone la API en `http://localhost:3000`, mientras que la base de datos queda disponible en el puerto `3306`. El volumen `./back/uploads` se monta en el contenedor para conservar los archivos adjuntos.

## Scripts principales del backend

| Comando                       | Descripción |
|-------------------------------|-------------|
| `npm run dev`                 | Levanta la API con `ts-node` y recarga automática.
| `npm run build`               | Compila TypeScript a JavaScript en `dist/`.
| `npm start`                   | Ejecuta la API compilada desde `dist/`.
| `npm test`                    | Corre la suite de tests con Jest + Supertest.
| `npm run seed`                | Inserta datos de prueba usando TypeORM.
| `npm run migration:run`       | Aplica las migraciones pendientes.
| `npm run migration:revert`    | Revierte la última migración aplicada.

## Notas adicionales

- Los tokens de refresco ahora guardan su fecha de expiración en base de datos para evitar errores con columnas `NOT NULL` y facilitar auditorías.【F:back/src/services/auth.ts†L16-L120】
- `controllers/auth` permite inyectar una instancia alternativa de `AuthService`, lo que simplifica el testeo con repositorios en memoria.【F:back/src/controllers/auth.ts†L1-L77】
- Para cualquier despliegue en producción se recomienda ajustar las variables de entorno del `docker-compose.yml`, especialmente los secretos JWT y credenciales de SMTP.
