# SPEC-005: Corrección de Visibilidad Persistente en Modal de Respaldo y Recuperación

## 1. Problema y Causa Raíz
Al interactuar con la aplicación, la ventana de **Respaldo/Recuperación** (`#modal-backup`) se mantenía visible permanentemente sobre la interfaz, bloqueando la interacción con otras opciones y pestañas del sistema.

### Causa Raíz Técnica
1. En el elemento `<dialog id="modal-backup">` se habían incluido las clases utilitarias de Tailwind CSS `flex flex-col`.
2. En Tailwind CDN, `.flex` define `display: flex;` con especificidad de clase `(0, 1, 0)`.
3. La hoja de estilos del navegador define para los diálogos nativos la regla `dialog:not([open]) { display: none; }` con especificidad de agente de usuario `(0, 0, 0)`.
4. En la cascada CSS, la clase del autor `.flex` prevalecía sobre la regla del agente de usuario, forzando `display: flex` incluso en ausencia del atributo `open`. Por consiguiente, el diálogo permanecía siempre visible en el flujo del documento, y la invocación de `dialog.close()` no lograba ocultarlo.

---

## 2. Solución Requerida
1. **Regla Defensiva en CSS Global:**
   Incorporar en el bloque `<style>` de `index.html`:
   ```css
   dialog:not([open]) {
     display: none !important;
   }
   ```
   Esto asegura que ningún modal nativo `<dialog>` se renderice en pantalla a menos que cuente con el atributo `open` activo mediante `showModal()`.
2. **Reestructuración de Clases en `<dialog id="modal-backup">`:**
   - Remover las clases de visualización `flex flex-col` de la etiqueta `<dialog>`.
   - Trasladar el contenedor flex y el scroll `overflow-y-auto` a un `<div>` interno que estructure la cabecera, el cuerpo y el pie de página.
   - Añadir un botón visible de cierre en el pie del modal (`Cerrar`) además del botón ✖ en la cabecera.
3. **Verificación Automatizada:**
   Añadir prueba unitaria en `tests/dojo_accounting.test.js` para asegurar que el elemento `<dialog id="modal-backup">` no posea clases de `display` incompatibles y que la regla `dialog:not([open])` esté presente.

