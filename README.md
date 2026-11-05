# Dojo de Karate La Reina — Gestión Financiera, Alumnos y Control de Cobranza

> **Aplicación Web Progresiva (SPA / PWA)** completa y moderna para la gestión financiera, control de mensualidades con aporte adicional al fondo de reserva, conciliación bancaria, arrastre multianual de deudas y emisión automática de cobranza por correo electrónico.

---

## 🥋 Características Principales

### 1. Control de Alumnos y Mensualidades
- **Gestión integral de atletas:** Registro y edición de nombre, RUT, teléfono/WhatsApp, correo electrónico afiliado, grado actual (Kyu/Dan), cuota pactada y día de vencimiento.
- **Semáforo inteligente:**
  - 🟢 **Al Día:** Cuotas del período cubiertas o alumnos becados ($0).
  - 🟡 **Por Vencer:** Vencimiento próximo en los días siguientes.
  - 🔴 **Moroso / Arrastre:** Cuotas pendientes del período actual o deudas acumuladas de períodos/años anteriores.
- **Historial y Estado de Cuenta:** Ficha individual detallada con desglose mes a mes.

### 2. Fondo de Reserva (10% sugerido y editable)
- Cada cobro de cuota mensual incluye por defecto un adicional calculado en **10%** para el **Fondo de Reserva**, ajustable libremente en cada transacción.
- La cuota operativa ingresa a la cuenta corriente regular y el adicional se abona automáticamente a la cuenta del Fondo de Reserva (`CTA-02` Banco Santander).

### 3. Programación y Emisión Automática de Cobranza
- **Regla de cobro mensual:** Programado para el día 3 de cada mes a las 01:00 AM (configurable).
- **Ejecución Inmediata:** Si la fecha u hora ya se cumplió y aún no se han enviado las notificaciones, el sistema ejecuta de inmediato la cobranza y actualiza los registros.
- **Despacho Multicanal:**
  - **Secuencia de 15 segundos con cierre de sesión en Gmail:** Emisión de correos individuales personalizados a los correos afiliados de cada atleta, abriendo la sesión y cerrándola automáticamente a los 15 segundos (`currentWindow.close()`) para evitar bloqueos por ventanas emergentes (pop-ups) en navegadores modernos.
  - **WhatsApp Web / App:** Enlace directo formateado con formato internacional (+569).
  - **Outlook Web y Mailto local:** Opciones de respaldo adicionales.
  - **Desglose transparente:** Carta personalizada que detalla Cuota Tatami, Aporte 10% Fondo de Reserva, Total a Pagar, deudas multianuales previas y cuentas bancarias oficiales.

### 4. Tesorería y Conciliación Bancaria
- **Cuentas bancarias:** Banco Estado (Cuenta Corriente Operativa), Banco Santander (Fondo de Reserva) y Caja Chica / Efectivo.
- **Transferencias internas:** Movimientos entre cuentas sin alterar el balance operacional del mes.
- **Plan de Cuentas Básico:** Estructura codificada (1000 - 5000) para egresos operacionales, instructores, torneos y sede.

### 5. Respaldo y Portabilidad
- Persistencia local en `localStorage` (sin base de datos externa obligatoria).
- Exportación e importación completa en formato JSON.
- Exportación de planilla mensual y libro diario a CSV.

---

## 💻 Stack Tecnológico
- **HTML5 Semántico y Accesible.**
- **Tailwind CSS (CDN)** con soporte para modo claro y oscuro.
- **JavaScript Vanilla (ES6+)** autocontenido y modular (`App`).
- **Lucide Icons (CDN).**
- **Test Runner nativo de Node.js:** `node --test tests/dojo_accounting.test.js` (22 pruebas unitarias contables y de flujo).

---

## 🚀 Cómo Ejecutar la Aplicación

No requiere compiladores (`npm build`, `vite`, `webpack`) ni configuración pesada:

### Opción 1: Directo en el navegador
Haz doble clic sobre `index.html` o ábrelo en cualquier explorador moderno (Chrome, Edge, Firefox, Safari).

### Opción 2: Con servidor local ligero
```bash
# Con Python
python -m http.server 8000

# Con Node.js
npx serve .
```
Luego abre `http://localhost:8000` en tu navegador.

---

## 🧪 Pruebas Unitarias

Para ejecutar el conjunto completo de pruebas automatizadas:

```bash
node --test tests/dojo_accounting.test.js
```

---

## 👤 Autor y Créditos
- **Análisis y Diseño:** Andres Aguiar V
- **Versión:** 2611.04 Santiago de Chile
- **Contacto:** +56933395447
