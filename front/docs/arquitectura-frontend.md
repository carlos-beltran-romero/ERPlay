# Arquitectura del frontend

## Estructura de carpetas
```
src/
├─ app/
│  ├─ App.tsx            # Composición raíz (RouterProvider + ToastContainer)
│  └─ router.tsx         # Definición de rutas y guardas por rol
├─ components/
│  └─ layout/
│     ├─ Header.tsx      # Cabecera con navegación contextual
│     └─ PageWithHeader.tsx
├─ config/
│  └─ env.ts             # Normalización de variables Vite
├─ services/
│  ├─ http.ts            # Cliente HTTP (apiRequest/apiJson + tokens)
│  └─ *.ts               # Servicios de dominio usando el helper anterior
├─ shared/
│  └─ utils/
│     ├─ datetime.ts     # formatDate*, formatDuration, etc.
│     ├─ text.ts         # letterFromIndex
│     └─ url.ts          # resolveAssetUrl
├─ views/
│  ├─ Student/...        # Páginas de alumno
│  └─ Supervisor/...     # Páginas de supervisor
└─ main.tsx              # Bootstrap minimal (StrictMode + App)
```

## Principios
- **Cliente HTTP único**: todas las llamadas usan `apiJson`/`apiRequest`, garantizando refresco de tokens y tratamiento homogéneo de errores.
- **Layout reutilizable**: el header vive en `components/layout`, evitando duplicaciones en cada vista.
- **Utilidades compartidas**: formatos de fecha/tiempo y resolución de URLs se centralizan en `shared/utils`.
- **Rutas declarativas**: `app/router.tsx` agrupa rutas por rol y aplica `loader` de autorización.
- **Servicios delgados**: cada archivo en `services/` transforma la respuesta del backend sin preocuparse por autenticación.

## Tabla de migración
| Antes | Después |
|-------|---------|
| `src/views/Header.tsx` | `src/components/layout/Header.tsx` |
| `src/views/PageWithHeader.tsx` | `src/components/layout/PageWithHeader.tsx` |
| `src/routes.tsx` | `src/app/router.tsx` |
| `ToastContainer` en `main.tsx` | `src/app/App.tsx` |

## Consideraciones
- Para añadir una nueva página, exporta el componente en `views/` y regístralo en `app/router.tsx` con el helper `protect`.
- Los servicios deben importar `apiJson` y, en caso de necesitar rutas relativas, delegar en `resolveAssetUrl` para imágenes/documentos.
- Las vistas deberían usar `formatDateTime`/`formatDuration` para mantener consistencia visual en fechas y tiempos.
