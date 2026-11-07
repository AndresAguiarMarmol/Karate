# SPEC-007: Corrección de Saldo de Deuda Arrastrada y Normalización de Fechas de Ingreso de Alumnos

## 1. Problema y Causa Raíz

### Problema
Al cargar o consultar los alumnos del Dojo (quienes ingresaron todos en **Noviembre de 2026** con mensualidades menores a $60.000 CLP), el sistema calculaba y desplegaba un **saldo de deuda arrastrado histórico exorbitante** (de cientos de millones de pesos por alumno), clasificando a todos los alumnos como *"Moroso (Arrastre)"* y activando falsas alarmas de deudas de años anteriores en el Dashboard.

### Causa Raíz Técnica
1. **Formato no ISO en Fechas de Ingreso:**
   En planillas CSV y exportaciones comunes en Chile y Latinoamérica (como `BD OK Nomina_Karate_Pagos_Noviembre_2026.csv`), las fechas de ingreso vienen registradas en formato día-mes-año (`DD-MM-YYYY` o `DD/MM/YYYY`, ej: `01-11-2026`).
2. **Corte Rígido de Substring en `getStudentFinancialStatus`:**
   El cálculo contable realizaba:
   ```javascript
   const startY = student.startDate ? parseInt(student.startDate.slice(0, 4), 10) : parseInt(targetYear, 10);
   const startM = student.startDate ? parseInt(student.startDate.slice(5, 7), 10) : 1;
   ```
   Al recibir `"01-11-2026"`:
   - `student.startDate.slice(0, 4)` producía `"01-1"`, que al ser parseado como entero resultaba en `startY = 1` (Año 1 d.C.).
   - `student.startDate.slice(5, 7)` producía `"-2"`, que resultaba en `startM = -2`.
   - El bucle for iteraba desde el año 1 hasta el año 2026 (`2.025` años), acumulando `24.314` mensualidades impagas inexistentes por cada alumno (más de $486.000.000 CLP por karateca).
   - Para el año actual (2026), se asumía erróneamente inicio en enero (`mStart = 1`), cobrando los meses de enero a octubre de 2026 a alumnos que recién ingresaron en noviembre.

---

## 2. Requerimientos

1. **Función de Normalización de Fechas (`normalizeDateToISO`):**
   - Debe interpretar de forma robusta cualquier formato de fecha de ingreso:
     - Formato latino/chileno: `DD-MM-YYYY` y `DD/MM/YYYY` (ej: `01-11-2026`, `1/11/2026`).
     - Formato ISO: `YYYY-MM-DD` y `YYYY/MM/DD` (ej: `2026-11-01`).
     - Formato período: `YYYY-MM` (ej: `2026-11`) o `MM-YYYY` (ej: `11-2026`).
   - Retornar siempre una cadena ISO canónica `YYYY-MM-DD`.
2. **Función de Parseo Numérico de Cuotas (`parseCurrencyNumber`):**
   - Manejar montos con puntos de miles y/o comas (ej. `"20.000"`, `"55.000"`, `"$40.000"`).
3. **Cálculo Contable Preciso en `getStudentFinancialStatus`:**
   - Normalizar la fecha de ingreso antes de extraer el año y mes inicial (`startY` y `startM`).
   - Para alumnos con ingreso en `2026-11`, no debe computarse deuda de meses anteriores al ingreso (enero a octubre de 2026) ni deuda histórica previa a 2026.
   - Si el alumno ingresó en noviembre de 2026 y no ha pagado noviembre, su deuda total debe ser exactamente el valor de una cuota mensual (< $60.000 CLP), con `historicalDebt = 0` y `historicalMonths = []`.
4. **Saneamiento Automático de Alumnos Existentes en `loadDatabase` y al Importar:**
   - En `App.loadDatabase()`, auditar y sanear las fechas `startDate` existentes en `this.db.students` normalizándolas a formato `YYYY-MM-DD`.
   - En `processSpreadsheetData`, procesar la fecha de ingreso con `normalizeDateToISO` para que quede limpia y estandarizada al importar nóminas CSV/Excel.
5. **Verificación Automatizada:**
   - Añadir pruebas unitarias en `tests/dojo_accounting.test.js` que verifiquen:
     - La normalización de fechas `01-11-2026` -> `2026-11-01`.
     - Que un alumno ingresado en noviembre de 2026 tenga `historicalDebt = 0` y solo adeude noviembre de 2026 si está impago.
     - Que la importación de `BD OK Nomina_Karate_Pagos_Noviembre_2026.csv` produzca exactamente $0 de deuda arrastrada histórica y cuotas acordes a cada alumno (< $60.000 CLP).
