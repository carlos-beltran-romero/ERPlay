# Arquitectura del frontend

## Visión general
El frontend de **ERPlay** está construido con React + Vite y organizado alrededor de capas bien definidas:

- **Capa de aplicación (`src/app/`)**: define contextos compartidos (autenticación, tema) y el router.
- **Capa de vistas (`src/views/`)**: páginas específicas para alumnos y supervisores.
- **Capa de componentes (`src/components/`)**: piezas reutilizables (layout, UI comunes) desacopladas de las vistas.
- **Capa de servicios (`src/services/`)**: cliente HTTP y funciones de dominio que se comunican con la API.
- **Capa compartida (`src/shared/`)**: utilidades puras (formateo, helpers de URL, constantes).

El estado global se reduce al mínimo imprescindible (perfil y tema) y se expone mediante contextos. El resto del estado se maneja de forma local en cada vista o componente.

## Estructura de carpetas
```
src/
├─ app/
│  ├─ App.tsx              # Providers globales + RouterProvider + ToastContainer
│  ├─ AuthContext.tsx      # Contexto de autenticación y helpers (profile, loading)
│  ├─ ThemeContext.tsx     # Contexto de tema (light/dark) con persistencia y media queries
│  └─ router.tsx           # Definición de rutas, loaders de autorización y páginas públicas
├─ components/
│  ├─ ThemeToggle.tsx      # Botón flotante para alternar tema
│  └─ layout/              # Cabeceras, contenedores y wrappers reutilizables
├─ config/
│  └─ env.ts               # Normalización de variables de entorno expuestas por Vite
├─ layouts/                # Layouts completos empleados por las vistas (dashboard, públicos, etc.)
├─ services/
│  ├─ http.ts              # Cliente HTTP (tokens, refresh, manejo centralizado de errores)
│  ├─ auth.ts              # Lógica de login/reset/logout apoyada en http.ts
│  ├─ authCache.ts         # Caché in-memory del perfil autenticado
│  └─ *.ts                 # Servicios de dominio (diagrams, questions, progress, ...)
├─ shared/
│  ├─ constants            # Enumeraciones, valores por defecto de formularios
│  ├─ hooks                # Hooks que encapsulan patrones repetidos
│  └─ utils                # Utilidades puras (formatos, parseo, construcción de URLs)
├─ views/
│  ├─ Login.tsx            # Autenticación y bootstrap del perfil
│  ├─ NotFound.tsx         # Página 404 genérica con CTA dinámico
│  ├─ Student/             # Flujos propios del alumnado (dashboard, juego, progreso)
│  └─ Supervisor/          # Gestión de alumnos, diagramas, evaluaciones
└─ main.tsx                # Punto de montaje con StrictMode + App
```

## Flujos clave
- **Autenticación resiliente**: `AuthProvider` inicializa el perfil usando `authCache` y los servicios de usuarios. Si expira la sesión, limpia tokens y redirige a login. Las vistas consultan `useAuth()` para renderizar contenido o loaders.
- **Protección de rutas**: `router.tsx` usa loaders que validan el rol antes de montar la vista. Las rutas públicas (login, recuperación) quedan accesibles sin sesión.
- **Modo oscuro/claro**: `ThemeProvider` sincroniza `localStorage`, `prefers-color-scheme` y la clase `dark` en `<html>`. El componente `FloatingThemeToggle` permite alternar desde cualquier pantalla.
- **Servicios declarativos**: los módulos de `services/` consumen `apiJson`/`apiRequest`, encapsulan las URLs y devuelven modelos tipados listos para la UI.

## Buenas prácticas
- **Reutiliza contextos**: Usa `useAuth()` y `useTheme()` en vez de manejar estado global manualmente.
- **Centraliza llamadas HTTP**: no invoques `fetch` directamente desde las vistas; crea un helper en `services/` y reutilízalo.
- **Componentiza layouts**: para nuevas pantallas, parte desde los componentes de `layouts/` y añade piezas de `components/` antes de crear duplicados.
- **Documenta con TSDoc**: cualquier función exportada debe llevar comentarios con las etiquetas necesarias para Typedoc (ej. `@public`, `@internal`, `@remarks`).
- **Rutas nuevas**: registra las vistas en `router.tsx`. Si requieren permisos, usa el helper `protect({ path, element, roles })` para añadir el loader.
