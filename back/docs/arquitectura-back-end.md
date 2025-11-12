# Arquitectura del back-end

## Visión general
El back-end de ERPlay es una API REST construida con **Node.js + Express** y **TypeORM** como capa de acceso a datos. Sigue una separación por responsabilidades que facilita el mantenimiento:

- **Configuración (`src/config/`)**: lectura de variables de entorno, constantes y helpers de configuración.
- **Core (`src/core/`)**: inicialización de dependencias transversales (p. ej. colas, seguridad).
- **Módulos de dominio (`src/controllers`, `src/services`, `src/models`)**: cada módulo agrupa entidades, lógica de negocio y adaptadores HTTP.
- **Infraestructura (`src/middlewares`, `src/routes`, `src/utils`)**: middlewares de Express, definición de rutas y utilidades reutilizables.
- **Inicialización (`src/app.ts`, `src/server.ts`, `src/index.ts`)**: ensamblan la aplicación, inician la base de datos y levantan el servidor HTTP.

La API expone documentación Swagger desde `GET /api/docs` y ofrece un endpoint de salud en `GET /health`.

## Ciclo de una petición
1. **Entrada**: las peticiones llegan a `createApp()` (Express) donde se aplican `helmet`, `cors`, logging y parseadores JSON/URL encoded.
2. **Ruteo**: `registerRoutes()` monta un router `/api` que agrupa módulos (auth, users, diagrams, exams, etc.) y sirve los assets de Swagger.
3. **Controladores**: cada archivo en `src/controllers/` transforma la solicitud en llamadas a servicios de dominio. Se encargan de validar DTOs y formatear la respuesta HTTP.
4. **Servicios**: encapsulan la lógica de negocio, orquestan repositorios TypeORM y utilidades. Están diseñados para ser testeables de manera aislada.
5. **Persistencia**: los modelos en `src/models/` definen entidades de TypeORM. El `AppDataSource` centraliza la conexión a MySQL y se inicializa desde `src/index.ts` antes de arrancar el servidor.
6. **Errores**: cualquier excepción pasa por `uploadErrorHandler`, `notFound` y finalmente `errorHandler`, que uniformiza la respuesta (códigos, payload `{ error }`).

## Estructura relevante
```
src/
├─ app.ts             # Factoría Express con middlewares comunes
├─ index.ts           # Bootstrap: inicializa TypeORM y arranca HTTP
├─ server.ts          # Exporta instancia Express (para tests / serverless)
├─ config/
│  └─ env.ts          # Normaliza variables de entorno (DB, JWT, CORS)
├─ controllers/       # Controladores HTTP por dominio (auth, exams, diagrams, ...)
├─ services/          # Lógica de negocio (validaciones, agregaciones, orquestación)
├─ models/            # Entidades TypeORM y relaciones
├─ routes/            # Routers de Express por módulo + documentación Swagger
├─ middlewares/       # Logger, auth guard, validación de archivos, manejadores de errores
├─ utils/             # Helpers transversales (hashing, fechas, mapper de respuestas)
├─ seeds/             # Scripts para poblar datos iniciales (opcional en despliegue)
├─ migrations/        # Migraciones TypeORM versionadas
└─ types/             # Definiciones de tipos compartidos (DTOs, payloads, enumeraciones)
```

## Consideraciones de diseño
- **Tipado estricto**: se utilizan DTOs y tipos auxiliares en `src/types/` para documentar inputs/outputs y reducir errores en controllers.
- **Separación de responsabilidades**: los servicios no dependen de Express; los controladores actúan como adaptadores.
- **Gestión de archivos**: los uploads se guardan en `/uploads` y se exponen de forma estática bajo `/api/uploads`.
- **Observabilidad**: el middleware `logger` centraliza trazas de cada petición, facilitando la monitorización.
- **Extensibilidad**: para añadir un módulo nuevo se recomienda crear entidad + servicio + controlador + router, registrar el router en `src/routes/index.ts` y documentar el contrato en `openapi.yaml`.
