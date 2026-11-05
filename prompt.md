Actúa como un arquitecto de software y desarrollador frontend senior. Diseña y programa una aplicación web completa (SPA / PWA) en un único archivo index.html (HTML5, CSS moderno y JavaScript modular autocontenido) para la gestión financiera, control de mensualidades y gastos de un Dojo de Karate.

La aplicación debe operar de forma offline persistiendo los datos en `localStorage`, con una interfaz moderna, limpia, adaptada tanto a dispositivos móviles como a pantallas de escritorio, y con opción para exportar e importar datos en formato JSON.

---

### 1. MODELO DE DATOS Y CONFIGURACIÓN INICIAL

#### Cuentas Bancarias / Fondos:
1. **Banco Estado - Cuenta Corriente Operativa** (Pagos principales, arriendos, servicios, transferencias de alumnos).
2. **Banco Santander - Cuenta de Ahorro / Fondo de Reserva** (Exámenes de grado, eventos, fondo de emergencia).
3. **Caja Chica / Efectivo** (Cobros directos en el dojo, gastos menores del día a día).

*Cada cuenta debe registrar: ID, Nombre, Tipo, Saldo inicial y Saldo actual (calculado dinámicamente).*

#### Plan de Cuentas Básico (Categorías de Salidas / Gastos):
- **1000 - Infraestructura y Sede:**
  - 1010 Arriendo del local / dojo
  - 1020 Servicios básicos (Luz, Agua, Gas, Internet)
  - 1030 Mantenimiento, aseo e insumos de limpieza
- **2000 - Operación Deportiva y Equipamiento:**
  - 2010 Mantenimiento de tatami y sacos
  - 2020 Compra de implementos (guantillas, escudos, cinturones)
  - 2030 Botiquín y primeros auxilios
- **3000 - Honorarios y Personal:**
  - 3010 Remuneración Instructores / Sensei
  - 3020 Personal de recepción o apoyo
- **4000 - Eventos y Afiliaciones:**
  - 4010 Cuotas de federación / asociación
  - 4020 Logística de torneos y seminarios
  - 4030 Certificados y trámites de exámenes de grado
- **5000 - Administración y Varios:**
  - 5010 Comisiones bancarias / pasarelas
  - 5020 Publicidad y marketing digital
  - 5030 Gastos imprevistos / varios

---

### 2. MÓDULOS Y FUNCIONALIDADES

#### Módulo 1: Alumnos y Control de Mensualidades (Ingresos Recurrentes)
- **Registro de Alumno:** Nombre completo, teléfono/WhatsApp, correo, grado actual (Kyu/Dan), valor mensual pactado y día de corte/vencimiento de pago (ej. día 5 de cada mes).
- **Semáforo de Pagos Mensual:**
  - Panel visual del mes en curso que clasifique a los alumnos en:
    - *Al día* (verde)
    - *Por vencer / Próximos días* (amarillo)
    - *Moroso / Atrasado* (rojo)
- **Registro rápido de pago:** Botón de un solo clic desde la ficha del alumno para asentar la mensualidad:
  - Seleccionar mes/año correspondiente.
  - Cuenta bancaria o fondo de destino.
  - Método (Transferencia, Efectivo, Tarjeta).
  - Comprobante / N° de operación (opcional).

#### Módulo 2: Registro de Salidas / Egresos
- Formulario de egreso con:
  - Fecha del gasto.
  - Categoría (según el Plan de Cuentas predefinido).
  - Cuenta de origen del dinero (descuenta automáticamente el saldo).
  - Proveedor / Beneficiario.
  - Detalle o glosa.
  - Monto y número de boleta/factura.

#### Módulo 3: Flujo de Caja y Conciliación de Cuentas
- Visualización de saldos en tiempo real de cada cuenta bancaria/caja.
- Posibilidad de realizar **Transferencias entre cuentas** (movimiento interno que descuenta de una y suma en otra sin alterar el resultado global).
- Libro diario / Historial de movimientos ordenable y filtrable por rango de fechas, cuenta bancaria, tipo (Ingreso/Egreso) y categoría.

#### Módulo 4: Dashboard y Reportes
- Tarjetas de resumen del mes actual: Total Ingresos, Total Gastos, Balance Neto del mes, y Alumnos Activos vs. Morosos.
- Gráfico simple o desglose porcentual de gastos por categoría principal.
- Función para exportar la planilla del mes a formato CSV y respaldar toda la base de datos en JSON.

---

### 3. REQUISITOS TÉCNICOS Y ESTILO

- **Formato:** Archivo único `index.html` con etiquetas `<style>` y `<script>` internas.
- **Sin dependencias pesadas obligatorias:** Usar JavaScript estándar moderno (ES6+) manipulando el DOM. Si se requiere un framework CSS o iconos, usar CDN ligero (ej. Tailwind CSS o Bootstrap y FontAwesome).
- **Persistencia:** Guardar automáticamente en `localStorage` ante cualquier alta, baja o edición, precargando datos demo coherentes la primera vez que se abra la app.
- **Validaciones:** Impedir que se registren gastos con montos negativos o campos clave vacíos.