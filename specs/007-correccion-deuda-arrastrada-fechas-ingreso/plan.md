# PLAN-007: Plan de Implementación Corrección de Saldo de Deuda Arrastrada

## 1. Modificaciones en `index.html`

1. **Métodos Utilitarios en `App`:**
   - Implementar `normalizeDateToISO(dateStr, fallbackISO)`:
     - Detectar patrones `DD-MM-YYYY`, `DD/MM/YYYY`, `YYYY-MM-DD`, `YYYY/MM/DD`, `YYYY-MM` y `MM-YYYY`.
     - Devolver fecha estandarizada `YYYY-MM-DD`.
   - Implementar `parseCurrencyNumber(val, defaultVal)`:
     - Interpretar correctamente números en pesos chilenos con punto separador de miles (`20.000` -> `20000`).
2. **Corrección de Cálculo en `getStudentFinancialStatus`:**
   - Utilizar `normalizeDateToISO(student.startDate, ...)` para obtener `startY` y `startM`.
   - Garantizar que los meses exigibles se generen exclusivamente desde el mes de ingreso real del alumno.
3. **Saneamiento Automático en `loadDatabase`:**
   - Al cargar la base de datos desde `localStorage`, recorrer `this.db.students` y normalizar cualquier `startDate` en formato latino o incompleto hacia `YYYY-MM-DD`.
4. **Saneamiento en `processSpreadsheetData` (Importación CSV/Excel):**
   - Aplicar `normalizeDateToISO` a `rec['fechaingreso']` y `parseCurrencyNumber` a las cuotas mensuales.

## 2. Pruebas Automatizadas en `tests/dojo_accounting.test.js`
- Test 27: Normalización de fechas de ingreso multiformato (`DD-MM-YYYY`, `YYYY-MM-DD`).
- Test 28: Cálculo contable exacto sin deuda histórica para alumnos ingresados en noviembre 2026.
- Test 29: Validación de importación de planilla con formato latino de fecha, verificando deuda histórica = $0 y deuda total < $60.000 CLP.

## 3. Actualización de Memoria y Repositorio
- Actualizar `memory.md` (Sección 2 y Sección 3).
- Commit y push a GitHub (`main`).

