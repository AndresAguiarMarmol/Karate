# SPEC-008: Validación de Pagos para Alumnos Solventes del Dojo

## 1. Problema y Causa Raíz

### Problema
Al intentar registrar un pago para un alumno solvente (que se encuentra "Al Día", con saldo de deuda $0 o becado), la aplicación permitía abrir el modal de pago y aceptaba la transacción contable. Esto generaba duplicidad de cobros, distorsión en los saldos bancarios del dojo e inconsistencia con el estado financiero del alumno que el propio sistema reporta como "Al Día".

### Causa Raíz Técnica
1. **Inyección Forzada del Período Activo en `openPaymentModal`:**
   En `App.openPaymentModal()`, la lógica ejecutaba:
   ```javascript
   const unpaidMonths = [...st.historicalMonths, ...st.currentYearUnpaidMonths];
   const activeMonth = `${this.selectedYear}-${this.selectedMonth}`;
   if (!unpaidMonths.includes(activeMonth)) {
     unpaidMonths.push(activeMonth);
   }
   ```
   Incluso si el alumno ya había pagado el mes en curso (`activeMonth`) o era becado ($0), el sistema forzaba la inserción del período en la lista desplegable y abría el modal.
2. **Ausencia de Validación en `handlePaymentSubmit`:**
   El manejador de envío de pagos no comprobaba si:
   - El alumno es becado ($0).
   - El período seleccionado ya registraba una transacción de pago (`tx.type === 'ingreso' && tx.studentId === student.id && tx.period === period`).
   - El período efectivamente formaba parte de los meses adeudados por el alumno.
3. **Disponibilidad de Botones de Pago en la Ficha y Tarjetas:**
   En la ficha detallada (`openStudentDetailModal`) y en las tarjetas de alumnos, los meses previos a la fecha de ingreso o meses solventes ofrecían la acción "+ Saldar cuota" / "Pagar".

---

## 2. Requerimientos

1. **Bloqueo Informativo en `openPaymentModal` para Alumnos Solventes:**
   - Si el alumno es becado (`student.status === 'becado'` o `student.monthlyFee === 0`), no debe abrirse el formulario de pago y se debe emitir un mensaje informativo: *"El alumno/a X tiene condición de Becado (cuota $0) y se encuentra solvente. No requiere registro de pagos."*.
   - Si el alumno no registra deudas pendientes (`st.totalDebt === 0` o `unpaidMonths.length === 0`), no debe abrirse el formulario y se debe notificar: *"El alumno/a X se encuentra totalmente al día y solvente. No registra cuotas pendientes por pagar."*.
2. **Validación Estricta en `handlePaymentSubmit`:**
   - Rechazar intentos de pago para alumnos becados.
   - Rechazar intentos de pago duplicados para períodos que ya hayan sido pagados previamente.
   - Validar que el período ingresado pertenezca al conjunto de meses efectivamente adeudados (`st.historicalMonths` o `st.currentYearUnpaidMonths`).
3. **Coherencia en la Interfaz de Usuario:**
   - En las tarjetas de alumnos (`renderStudentsGrid`), si el alumno está al día o solvente, mostrar visualmente el botón como `[✅ Al Día]`.
   - En la ficha detallada (`openStudentDetailModal`):
     - Meses pagados: mostrar `PAGADO` / `Al día`.
     - Meses de alumnos becados: mostrar `EXENTO` / `Becado ($0)`.
     - Meses previos a la fecha de ingreso: mostrar `PREVIO` / `Previo al ingreso` (sin botón "+ Saldar cuota").
     - Solo los meses efectivamente pendientes deben mostrar la opción "+ Saldar cuota".
4. **Verificación Automatizada:**
   - Incorporar pruebas unitarias en `tests/dojo_accounting.test.js` que verifiquen:
     - Bloqueo de pago para alumnos becados.
     - Bloqueo de pagos duplicados para períodos ya pagados.
     - Bloqueo de pagos para alumnos con deuda $0.
     - Permisión exclusiva de pagos para períodos pendientes genuinos.
