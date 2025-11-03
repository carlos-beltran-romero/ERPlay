# ERPlay

Suite fullstack para la creación y evaluación colaborativa de diagramas entidad–relación. Este repositorio incluye API en Node.js/TypeScript (Express + TypeORM) y un frontend en React (Vite + Tailwind).

## Requisitos

- Node.js 20 LTS
- MySQL 8.x
- npm 10+

## Configuración rápida

1. Clona el repositorio y duplica el archivo de variables de entorno:
   ```bash
   cp back/.env.example back/.env
   cp back/.env.test back/.env.test.local # opcional para personalizar pruebas
   ```
2. Instala dependencias:
   ```bash
   cd back && npm install
   cd ../front && npm install
   ```
3. Ejecuta migraciones sobre tu base de datos de desarrollo:
   ```bash
   cd back
   npm run migration:run
   ```
4. Inserta los datos de ejemplo:
   ```bash
   mysql -h <host> -u <usuario> -p<password> <nombre_bd> < ../scripts/seed.sql
   ```

### Credenciales de prueba

| Rol        | Usuario                  | Contraseña    |
|------------|-------------------------|---------------|
| Supervisor | `supervisor@erplay.io`   | `Password123` |
| Alumno     | `alumno1@erplay.io`      | `Password123` |
| Alumno     | `alumno2@erplay.io`      | `Password123` |

## Ejecución en desarrollo

### Backend
```bash
cd back
npm run dev
```
El API expone por defecto `http://localhost:3000`.

### Frontend
```bash
cd front
npm run dev
```
La SPA queda disponible en `http://localhost:5173` y consume el backend mediante la variable `VITE_API_URL` (configurable en `front/.env.local`).

## Docker Compose

Para disponer de un entorno completo con MySQL y hot reload:

```bash
cp back/.env.example back/.env
docker compose up --build
```

Servicios incluidos:

- **db**: MySQL 8.4 con healthcheck (`mysqladmin ping`). Persistencia en el volumen `mysql_data`.
- **api**: API en modo desarrollo (`npm run dev`) con recarga en caliente. Monta `back/src` y `back/uploads` como volúmenes.
- **web** *(perfil opcional `frontend`)*: frontend de Vite en modo desarrollo (`docker compose --profile frontend up`).

Para construir imágenes optimizadas:

```bash
docker build --target backend-prod -t erplay-api .
docker build --target frontend-prod -t erplay-web .
```

## Pruebas automatizadas

La API dispone de pruebas de integración con Jest + Supertest.

```bash
cd back
npm run test
```
> Requiere una base de datos MySQL accesible con la configuración de `back/.env.test` y aplica las migraciones automáticamente. `npm run test:ci` genera cobertura en `back/coverage`.

## Scripts disponibles

### Backend (`back/package.json`)
- `dev`: ejecución con `ts-node` y nodemon.
- `build`: compila a `dist/` mediante `tsc`.
- `start`: arranca la API desde la salida compilada.
- `test` / `test:ci`: ejecutan la suite de Jest en modo estándar o con cobertura.
- `migration:*`: auxiliares de TypeORM para generar o revertir migraciones.

### Frontend (`front/package.json`)
- `dev`: servidor Vite con HMR.
- `build`: genera el artefacto de producción.
- `preview`: revisa la build localmente.
- `test` / `test:ci`: disponibles para futuras suites (placeholder).

## Semilla de base de datos

`scripts/seed.sql` es idempotente y proporciona:
- Un supervisor y dos alumnos con contraseñas conocidas.
- Un diagrama de ejemplo con preguntas de catálogo y aportes del alumnado.
- Datos asociados (opciones, metas semanales y badges) para explorar el panel de progreso.

Ejecuta el script tras las migraciones para contar con datos realistas y compatibles con las pruebas.

## Vista de inicio

La ruta `/` presenta una landing page responsive con llamadas a la acción para supervisores y alumnado, conservando coherencia con el modo oscuro del resto de la aplicación.
