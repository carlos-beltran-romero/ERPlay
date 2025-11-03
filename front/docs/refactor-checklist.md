# Checklist de verificación rápida

- [ ] `npm run build` (incluye `tsc -b`) sin errores.
- [ ] `npm run lint` limpia.
- [ ] Navegar `npm run dev` y comprobar rutas clave:
  - [ ] `/login`, `/forgot-password`, `/reset-password`.
  - [ ] Flujos de alumno: `/student/dashboard`, `/student/play-menu`, `/student/my-tests`, `/student/progress`.
  - [ ] Flujos de supervisor: `/supervisor/dashboard`, `/supervisor/tests`, `/supervisor/users`, `/supervisor/questions/review`.
- [ ] Formularios críticos mantienen estados de carga/errores (ej. creación de reclamación y preguntas).
- [ ] Las llamadas HTTP responden con los mismos contratos (verificar en devtools que los endpoints y payloads no cambian).
- [ ] Validar accesibilidad básica: navegación por teclado en `Header` y botones principales.
- [ ] Confirmar que los deep-links copiados anteriormente siguen funcionando (loader `protect`).
