# SPEC-006: Selección Automática del Mes y Año Actual en el Período

## 1. Problema y Causa Raíz
Al iniciar o recargar la aplicación web del Dojo de Karate, el selector de período en la cabecera (`#select-year` y `#select-month`) quedaba fijado de forma rígida en `2026` y mes `03` (Marzo) debido a valores cableados en el HTML (`<option value="03" selected>Marzo</option>`) y en la definición del objeto `App` (`selectedYear: '2026'`, `selectedMonth: '03'`). En `setupSelects()`, aunque se instanciaba `const now = new Date()`, no se utilizaba para inicializar dinámicamente los selectores.

Como consecuencia, al abrir la aplicación el usuario siempre visualizaba el período de Marzo 2026 en lugar del mes en curso, requiriendo un cambio manual en cada sesión.

---

## 2. Requerimientos
1. **Detección Dinámica del Mes y Año en Curso:**
   - Al cargar la aplicación (`App.init()` -> `setupSelects()`), el sistema debe determinar el año (`now.getFullYear()`) y el mes en curso (`String(now.getMonth() + 1).padStart(2, '0')`).
   - El estado de la aplicación (`App.selectedYear` y `App.selectedMonth`) debe inicializarse con el año y mes actual.
2. **Sincronización de Controles en la Cabecera:**
   - El selector `#select-month` debe posicionarse en el mes actual.
   - El selector `#select-year` debe posicionarse en el año actual. Si el año actual no está presente en las opciones estáticas, debe insertarse dinámicamente.
   - Eliminar el atributo `selected` cableado en Marzo en el HTML.
3. **Persistencia de la Libertad de Navegación:**
   - La selección manual mediante `App.setMonth(val)` y `App.setYear(val)` debe continuar funcionando libremente si el usuario desea auditar períodos pasados o futuros durante la sesión.
4. **Verificación Automatizada:**
   - Agregar prueba unitaria en `tests/dojo_accounting.test.js` que valide que `setupSelects()` y la inicialización de `App` seleccionen siempre el mes y año actual según la fecha del sistema.
