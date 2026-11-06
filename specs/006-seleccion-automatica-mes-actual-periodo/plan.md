# PLAN-006: Plan de Implementación Selección Automática del Mes Actual

## 1. Modificaciones en `index.html`
- **Markup HTML:**
  - Remover `selected` de `<option value="03" selected>Marzo</option>` en `#select-month`.
  - Asegurar un rango razonable de años en `#select-year` (ej. 2024 a 2028).
- **Lógica JavaScript (`App`):**
  - Inicializar `App.selectedYear` y `App.selectedMonth` dinámicamente con `String(new Date().getFullYear())` y `String(new Date().getMonth() + 1).padStart(2, '0')`.
  - En `App.setupSelects()`:
    - Obtener `now = new Date()`.
    - Asignar `this.selectedYear` y `this.selectedMonth` con los valores de la fecha actual.
    - Sincronizar el valor de `#select-year` y `#select-month`.
    - Si el año actual no está presente como `<option>` en `#select-year`, añadirlo programáticamente.

## 2. Pruebas Automatizadas
- Añadir en `tests/dojo_accounting.test.js`:
  - Prueba 40: Validar que `setupSelects()` configure `App.selectedYear` y `App.selectedMonth` concordantes con la fecha real del sistema (`new Date()`), y sincronice los elementos select del DOM.

## 3. Actualización de Memoria y Repositorio
- Actualizar `memory.md` (Sección 2 con la decisión técnica y Sección 3 con el historial de cambios).
- Commit y push a GitHub (`main`).

