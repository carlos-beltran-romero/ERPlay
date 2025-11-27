# Arquitectura del frontend

## Visión general

El cliente web está construido con **React 19**, **Vite** y CSS con Tailwind v4. Se organiza por capas para aislar vistas, servicios y estado compartido:

- **`src/app/`**: providers globales (autenticación, tema), router y bootstrap de notificaciones.
- **`src/views/`**: páginas de negocio separadas por rol (estudiante y supervisor) y flujos públicos (login, recuperación).
- **`src/layouts/`** y **`src/components/`**: layouts completos y componentes reutilizables (cabeceras, toggles, wrappers).
- **`src/services/`**: cliente HTTP, caché de sesión y servicios de dominio (users, diagrams, progress...).
- **`src/shared/`** y **`src/types/`**: constantes, hooks y tipos comunes.

La UI aplica modo claro/oscuro mediante variables CSS y clases `:root.dark`, con gradientes y tokens definidos en `src/index.css`.

## Composición de la aplicación

- `App.tsx` envuelve el router en `ThemeProvider` y `AuthProvider`, añade `ToastContainer` y el `FloatingThemeToggle` para alternar el tema global.【F:front/src/app/App.tsx†L1-L33】
- `AuthContext.tsx` recupera el perfil desde la API o la caché (`authCache`), mantiene el estado de carga y expone helpers para refrescar o sobrescribir el perfil en cualquier vista.【F:front/src/app/AuthContext.tsx†L15-L123】
- `ThemeContext.tsx` sincroniza el tema con `localStorage` y `prefers-color-scheme`, aplicando la clase `dark` en `<html>`.

## Enrutado y protección

- `router.tsx` define las rutas públicas y protegidas. Los loaders `requireRole` y `redirectIfAuthenticated` validan el rol antes de montar cada vista y redirigen a login o al dashboard correspondiente.【F:front/src/app/router.tsx†L28-L120】
- El mismo router redirige `/` a `/login` y expone un `NotFound` genérico para rutas inexistentes.

## Servicios y consumo de API

- `services/http.ts` centraliza `fetch`, maneja tokens JWT (almacenados en `localStorage`), realiza refresh automático y normaliza errores de red, permitiendo configurar `VITE_API_URL` como absoluto o relativo según el entorno.【F:front/src/services/http.ts†L1-L200】
- `config/env.ts` valida `VITE_API_URL` en tiempo de arranque para evitar builds sin backend configurado.【F:front/src/config/env.ts†L6-L16】
- Servicios específicos (`services/users`, `services/auth`, etc.) consumen `apiJson/apiRequest` y devuelven modelos listos para la UI.

## Estilos y theming

- `src/index.css` define los tokens de color y sombras para ambos temas, con degradados de fondo y overrides para componentes Tailwind. Cambiar el tema actualiza `:root` y la clase `dark` para toda la aplicación.【F:front/src/index.css†L1-L120】

## Desarrollo y despliegue

- El entorno de desarrollo usa Vite (`npm run dev`), mientras que la build de producción (`npm run build`) se sirve detrás de Nginx en Docker con el proxy `/api` hacia el backend.
- `VITE_API_URL` debe apuntar a `/api` cuando se usa el stack Docker, o a `http://localhost:3000/api` en desarrollo local sin proxy.
- Las dependencias de linting (`npm run lint`) y typescript (`tsc -b`) aseguran calidad del código antes de la build.
