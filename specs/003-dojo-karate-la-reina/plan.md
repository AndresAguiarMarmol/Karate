# Plan de Implementación: SPEC-003

## Arquitectura de la Solución
Archivo único autocontenido `index.html` que integra:
1. **Head & Dependencias CDN:**
   - Tailwind CSS CDN con configuración custom (paleta `dojo-red`, `dojo-slate`, `dojo-gold`).
   - Lucide Icons CDN.
   - Meta tags PWA, responsive viewport y tipografía Inter/Plus Jakarta Sans.
2. **Capa de Estilos (`<style>`):**
   - Reglas de scrollbar, transiciones, animaciones suaves de modales, estados del semáforo (pulse animado para morosos), formato de impresión y clases de utilidad.
3. **Capa de Maquetación HTML:**
   - Header corporativo: Escudo / Logo "Dojo de Karate - Municipalidad de La Reina", selector de año activo, selector de mes, botón de respaldo/restauración JSON y balance rápido total en caja.
   - Navegación por pestañas (Tabs):
     - Tab 1: **Dashboard & Métricas**
     - Tab 2: **Alumnos & Cobranza** (Semáforo, deuda arrastrada, pago rápido)
     - Tab 3: **Egresos & Plan de Cuentas** (Nuevo egreso, desglose)
     - Tab 4: **Cuentas & Transferencias** (Conciliación bancaria, movimiento interbancario)
     - Tab 5: **Libro Diario / Movimientos** (Historial completo, filtros, exportación CSV)
   - Modales (`<dialog>` nativos o overlays accesibles):
     - Modal Nuevo Alumno / Editar Alumno
     - Modal Registrar Pago de Mensualidad (con selector de mes histórico pendiente)
     - Modal Registrar Nuevo Egreso
     - Modal Nueva Transferencia entre Cuentas
     - Modal Ficha de Alumno con detalle de Deudas y Pagos
     - Modal Respaldo / Restauración de Datos JSON
4. **Capa Lógica JavaScript Modular Interna (`<script>`):**
   - `DB_MODULE`: Esquema de datos, carga de `localStorage`, seed data inicial realista si está vacío, guardado reactivo, export/import JSON.
   - `CALC_MODULE`: Cálculo de saldos de cuentas, cálculo del estado del semáforo para cada alumno para cualquier mes/año, cálculo dinámico de deudas arrastradas de años anteriores, desglose de meses impagos, totales del mes.
   - `UI_MODULE`: Renderizado dinámico de componentes, tabs, modales, alertas y formateadores de moneda CLP (`$XX.XXX`).
   - `EVENT_HANDLERS`: Formularios de alta, cobros, egresos, transferencias, filtros en tiempo real y exportación CSV.

## Fases de Trabajo
1. Especificación y Tasks (SDD).
2. Construcción del motor de datos con semáforo y lógica de arrastre multianual de deudas.
3. Maquetación y estilos de la interfaz SPA/PWA con estética limpia de Dojo Municipal.
4. Conexión de todos los formularios interactivos, modales y validaciones.
5. Verificación de flujo financiero: saldo inicial -> pagos alumnos -> egresos -> transferencias -> cambio de año y arrastre.
6. Actualización de `memory.md`.

