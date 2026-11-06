# PLAN-005: Plan de Corrección de Visibilidad en Modal de Respaldo

## 1. Cambios de Código en `index.html`
1. **Regla CSS:** Añadir en `<style>`:
   ```css
   dialog:not([open]) {
     display: none !important;
   }
   ```
2. **Estructura HTML de `#modal-backup`:**
   - `<dialog id="modal-backup" class="p-0 rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg bg-white overflow-hidden">`
   - Wrapper interno: `<div class="flex flex-col max-h-[90vh]">...</div>`
   - Cabecera fija (`shrink-0`), contenido con scroll (`overflow-y-auto`) y pie con botón "Cerrar" (`shrink-0`).

## 2. Pruebas Automatizadas
- Añadir en `tests/dojo_accounting.test.js`:
  - Prueba 25: Validar que `index.html` contenga la regla `dialog:not([open]) { display: none !important; }` y que `#modal-backup` no tenga clases `flex` en su etiqueta `<dialog>`.
