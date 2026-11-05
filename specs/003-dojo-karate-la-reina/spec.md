# SPEC-003: Sistema de Gestión Financiera y Control de Mensualidades — Dojo de Karate Municipalidad de La Reina

## 1. Contexto y Objetivos
Desarrollar una aplicación web (SPA / PWA autocontenida en un único archivo `index.html`) para el Dojo de Karate de la Municipalidad de La Reina, orientada a la administración de alumnos, control de mensualidades con semáforo de cobros, arrastre automático de deudas en cambios de año contable, registro de egresos por plan de cuentas estructurado, conciliación de fondos bancarios/caja chica, transferencias interbancarias y analítica financiera con exportación e importación de datos.

## 2. Requerimientos Funcionales

### RF-01: Cuentas y Fondos de Tesorería
- **Cuentas iniciales:**
  - `CTA-01`: Banco Estado - Cuenta Corriente Operativa (Tipo: Corriente / Pagos principales, arriendos, transferencias alumnos).
  - `CTA-02`: Banco Santander - Cuenta de Ahorro / Fondo de Reserva (Tipo: Ahorro / Exámenes de grado, eventos, emergencias).
  - `CTA-03`: Caja Chica / Efectivo (Tipo: Efectivo / Cobros presenciales en dojo, gastos menores diarios).
- **Cálculo de Saldos:**
  $$\text{Saldo Actual} = \text{Saldo Inicial} + \sum \text{Ingresos} - \sum \text{Egresos} + \sum \text{Transferencias Entrantes} - \sum \text{Transferencias Salientes}$$
- **Transferencias entre cuentas:** Movimiento neutro de balance que debita una cuenta y acredita otra registrando glosa, fecha y comprobante.

### RF-02: Plan de Cuentas para Egresos
Estructurado en árbol con códigos:
- `1000 - Infraestructura y Sede`: 1010 Arriendo, 1020 Servicios básicos, 1030 Mantenimiento y aseo.
- `2000 - Operación Deportiva y Equipamiento`: 2010 Mantenimiento tatami y sacos, 2020 Compra de implementos, 2030 Botiquín primeros auxilios.
- `3000 - Honorarios y Personal`: 3010 Remuneración Instructores/Sensei, 3020 Personal de recepción/apoyo.
- `4000 - Eventos y Afiliaciones`: 4010 Cuotas federación/asociación, 4020 Logística torneos y seminarios, 4030 Certificados y exámenes de grado.
- `5000 - Administración y Varios`: 5010 Comisiones bancarias, 5020 Publicidad/marketing, 5030 Gastos imprevistos.

### RF-03: Gestión de Alumnos y Mensualidades con Arrastre Multianual
- **Datos de Alumno:** ID, Nombre completo, RUT/Identificación, WhatsApp/Teléfono, Correo, Grado actual (desde 10° Kyu Blanco hasta Dan Cinturón Negro), Valor mensual pactado (permite $0 para becados municipales), Día de vencimiento/corte (ej. día 5 de cada mes), Estado (Activo / Inactivo / Becado), Fecha de ingreso.
- **Historial de Pagos y Cuotas:**
  - Cada alumno posee un registro de mensualidades por año y mes (`YYYY-MM`).
  - **Lógica de Arrastre de Deudas Multianual:**
    - Al seleccionar un año de gestión o cambiar de año calendario (ej. 2025 -> 2026):
      - Se calcula la deuda acumulada de todos los períodos anteriores no pagados desde la fecha de ingreso del alumno.
      - Se expone en la ficha del alumno:
        1. **Saldo total acumulado arrastrado** de años anteriores.
        2. **Desglose interactivo** de cada mes histórico impago con opción directa de "Pagar mes histórico".
        3. Deuda del año en curso.
        4. Total general adeudado.
- **Semáforo de Pagos del Mes en Curso:**
  - **Al día (Verde):** Cuota del mes actual pagada y sin deudas de meses previos.
  - **Por vencer (Amarillo):** Mes actual pendiente pero dentro del plazo (día actual <= día de corte) y sin morosidad previa.
  - **Moroso / Atrasado (Rojo):** Mes actual vencido (día actual > día de corte) O arrastra meses impagos previos.
- **Registro Rápido de Pago:**
  - Un solo clic desde la tarjeta/fila del alumno.
  - Modal con selección del período a saldar (sugiere el mes más antiguo adeudado), monto (precargado con el pactado o editable), cuenta de destino, método de pago (transferencia, efectivo, débito, crédito) y N° comprobante.
  - Genera automáticamente un movimiento de ingreso en el Libro Diario y actualiza el saldo de la cuenta elegida.

### RF-04: Registro de Egresos
- Formulario de egreso con validaciones estrictas (monto > 0, fecha, cuenta origen, categoría del plan de cuentas, beneficiario/proveedor, glosa y N° factura/boleta opcional).
- Descuenta automáticamente el saldo de la cuenta de origen.

### RF-05: Libro Diario y Conciliación
- Tabla unificada de movimientos (Ingresos, Egresos, Transferencias).
- Filtros dinámicos por: Rango de fechas, Cuenta de origen/destino, Tipo de movimiento, Categoría, Búsqueda por texto (alumno, proveedor, glosa).
- Paginación o scroll fluido y ordenamiento por fecha.
- Anulación / Eliminación controlada de movimientos con reversión automática de saldos.

### RF-06: Dashboard, Reportes y Exportación/Importación
- Tarjetas KPI: Ingresos del mes, Egresos del mes, Balance neto mensual, Total alumnos, Alumnos al día vs. morosos, Deuda total por cobrar.
- Gráfico / Visualizador interactivo de desglose de gastos por categoría (barras de porcentaje relativas y totales).
- Exportación mensual a CSV (compatible con Excel).
- Respaldo completo en JSON (alumnos, movimientos, cuentas, configuraciones).
- Restauración / Importación desde archivo JSON con validación de esquema.

## 3. Requerimientos No Funcionales
- **PWA / Offline First:** Opera 100% en el cliente sin requerir backend.
- **Persistencia:** `localStorage` con clave `dojo_karate_la_reina_v1`. Precarga con datos demo realistas de la Municipalidad de La Reina en la primera ejecución.
- **Compatibilidad:** Móvil, tablet y escritorio con diseño responsive y moderno (Tailwind CSS CDN, Lucide Icons, tipografía legible y colores acordes al karate tradicional y la comuna).

