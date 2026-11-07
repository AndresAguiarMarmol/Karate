# PLAN-008: Plan de Implementación Validación de Pagos para Alumnos Solventes

## 1. Modificaciones en `index.html`

1. **En `App.openPaymentModal(studentId, defaultPeriod)`:**
   - Calcular `st = this.getStudentFinancialStatus(student)`.
   - Validar solvencia por condición de beca (`student.status === 'becado'` o `monthlyFee === 0`).
   - Validar solvencia por ausencia de deudas (`st.totalDebt === 0` o `unpaidMonths.length === 0`).
   - Eliminar la inyección forzada de `activeMonth` si dicho mes no se adeuda.
2. **En `App.handlePaymentSubmit(e)`:**
   - Comprobar si el alumno es becado y abortar si aplica.
   - Comprobar si `this.db.transactions` ya contiene un ingreso con `studentId` y `period` coincidentes y abortar si aplica.
   - Comprobar si el período pertenece a `unpaidMonths` del alumno y abortar si no se adeuda.
3. **En `App.renderStudentsGrid()`:**
   - Distinguir visualmente el botón de pago entre alumnos con deuda (`Pagar`) y alumnos al día (`Al Día`).
4. **En `App.openStudentDetailModal(studentId)`:**
   - Excluir meses previos a la fecha de ingreso (`startDate`) de la etiqueta `PENDIENTE` y del botón "+ Saldar cuota".

## 2. Pruebas Automatizadas en `tests/dojo_accounting.test.js`
- Test 31: `openPaymentModal` rechaza abrir pago si el alumno es becado o no tiene deuda pendiente.
- Test 32: `handlePaymentSubmit` rechaza registrar pago para un período que ya fue pagado (prevención de pagos duplicados).
- Test 33: `handlePaymentSubmit` rechaza registrar pago para un período no adeudado (alumno solvente).
- Test 34: `handlePaymentSubmit` procesa exitosamente el pago cuando el período efectivamente está adeudado.

## 3. Actualización de Memoria y Repositorio
- Actualizar `memory.md` (Sección 2 y Sección 3).
- Commit y push a GitHub (`main`).
