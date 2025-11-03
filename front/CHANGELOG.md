# Changelog

## Refactor frontend (2025-02-14)
- Centralicé la obtención de configuración y el cliente HTTP en `src/config/env.ts` y `src/services/http.ts`, añadiendo gestión uniforme de tokens, refresco y errores JSON.
- Moví el layout común a `src/components/layout` y encapsulé el router/toast en `src/app/App.tsx`, simplificando el bootstrap (`src/main.tsx`).
- Añadí utilidades compartidas para formatos de fecha, duraciones y URLs en `src/shared/utils`, reemplazando duplicados en vistas de estudiantes y supervisores.
- Simplifiqué servicios de datos (`src/services`) para usar los nuevos helpers `apiJson`/`apiRequest`, eliminando parseos manuales y normalizando mapeos de respuestas.
- Documenté la arquitectura resultante y los pasos de QA en `docs/arquitectura-frontend.md` y `docs/refactor-checklist.md`.
