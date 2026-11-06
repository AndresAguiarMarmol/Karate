# memory.md — Memoria del proyecto Dojo de Karate (Municipalidad de La Reina)

Registro de todo lo que debe preservarse entre sesiones de trabajo: arquitectura de datos, decisiones técnicas tomadas e historial de cambios.
**Los agentes deben leer este archivo antes de empezar y actualizarlo al terminar cada tarea** (ver `AGENTS.md`).

---

## 1. Estructura de datos y persistencia

### A. Persistencia en `localStorage`
- **Clave principal:** `dojo_karate_la_reina_db_v3`
  - **Estructura JSON:**
    - `settings`: Configuración general del dojo:
      - `senderEmail`: Correo oficial del dojo para remitente de cobranza.
      - `billingSchedule`: Configuración de cobranza programada (`enabled: true`, `dayOfMonth: 3`, `hour: 1`, `minute: 0`, `lastExecutedMonth: null`, `lastExecutedTimestamp: null`, `dispatchedStudents: {}`).
    - `accounts`: Lista de cuentas de tesorería (`CTA-01` Banco Estado Cta Cte, `CTA-02` Banco Santander Fondo Reserva, `CTA-03` Caja Chica Tatami) con saldos iniciales blanqueados en `$0` (`initialBalance: 0`).
    - `students`: Lista de alumnos inicializada vacía (`[]`) lista para el ingreso de karatecas reales (con campo `email` afiliado).
    - `transactions`: Lista unificada de movimientos contables inicializada vacía (`[]`), garantizando un patrimonio inicial neto de `$0.00`.
  - **Comportamiento:** Si no existe la clave en `localStorage` o se detecta una sesión previa, se inicializa con la base de cuentas operativas blanqueadas a `$0` y sin transacciones demo.

---

## 2. Decisiones vigentes

Decisiones ya tomadas que deben respetarse salvo indicación explícita del usuario:

- **Metodología SDD (Spec-Driven Development):** Todo requerimiento se documenta en `specs/` con `spec.md`, `plan.md` y `tasks.md` antes de ser integrado y probado.
- **SPA Autocontenida en un único archivo `index.html`:** Sin dependencias de compilación (`npm build`, `webpack`, `vite`). Toda la estructura HTML, estilos responsivos con Tailwind CSS CDN, Lucide Icons y lógica JavaScript modular (`App`) reside en `index.html`.
- **Cobranza Automática Programada (Día 3 de cada mes a las 01:00 AM) con Ejecución Inmediata por Fecha:**
  - Se implementa una triple capa de ejecución confiable:
    1. **Capa Agente / Sistema:** Tarea cron recurrente (`schedule` con expresión `0 1 3 * *` en modo Daemon) que activa al agente el día 3 de cada mes a la 01:00 AM para verificar morosidad y preparar las emisiones.
    2. **Capa Aplicación Web SPA Reactiva (Intervalo de 60s y Comprobación al Inicio):** Motor `checkAutomatedBillingSchedule()`. Si la fecha y hora programada ya se cumplió o se superó en el mes actual (`day > sched.dayOfMonth` o `day === sched.dayOfMonth && hour >= sched.hour`) y el período aún no ha sido ejecutado/notificado, el sistema ejecuta **de inmediato** la cobranza (`executeImmediateAutomatedBilling`), actualiza el período ejecutado, marca la fecha/hora en la persistencia y notifica al usuario con un banner de ejecución en el Dashboard.
    3. **Botón de Ejecución Forzada en Caliente:** El modal de programación incorpora el botón `[⚡ Ejecutar de Inmediato]` para procesar o reintentar la emisión bajo demanda.
- **Cobranza por Correo Electrónico y Despacho Multicanal Real (Sin Alertas Engañosas):**
  - **Eliminación de falsos avisos:** Anteriormente el sistema disparaba `mailto:` y desplegaba una alerta indicando que el correo "fue enviado", lo cual no ocurría si el usuario carecía de cliente local configurado. Se eliminaron por completo las alertas engañosas.
  - **Canales de Despacho Directos y 100% Funcionales:**
    - **Gmail Web:** Enlace profundo (`mail.google.com`) con destinatario, asunto y mensaje completo listos para presionar Enviar.
    - **Outlook Web:** Enlace profundo (`outlook.live.com`) listo para despacho.
    - **WhatsApp Web / App:** Enlace directo (`api.whatsapp.com`) con teléfono validado y formato nacional de Chile (+569).
    - **App Local (`mailto:`):** Con advertencia honesta para clientes instalados.
    - **Recorrido Secuencial de Deudores con Separación de 15s y Cierre de Sesión:** Para resolver las restricciones de bloqueo de ventanas emergentes (pop-ups) y saturación de pestañas en navegadores modernos al emitir cobros a toda la nómina, el sistema implementa un motor secuencial en `App.dispatchBatchIndividualEmails(customDelay)`:
      - Recorre uno a uno a los deudores con cuotas pendientes y correo afiliado.
      - Abre la sesión de Gmail pre-cargada con el borrador individual en una ventana controlada (`window.open(url, 'dojo_billing_session')`).
      - Establece un intervalo de espera de **15 segundos** por deudor con cronómetro regresivo en vivo (`15s restantes`) y barra de progreso animada.
      - Al completarse los 15 segundos (o antes de abrir al siguiente alumno), ejecuta de forma automática el cierre de la ventana/sesión de correo previa (`currentWindow.close()`), liberando memoria y evitando que el explorador bloquee la navegación por considerarla spam.
      - Al finalizar la nómina completa, cierra automáticamente la última sesión abierta y notifica el éxito.
      - Dispone de controles interactivos en tiempo real para **Pausar**, **Reanudar** o **Detener** la secuencia según la necesidad del operador.
  - **Trazabilidad de Despacho:** Cada acción registra el estado del atleta (`dispatchedStudents[period]`), reflejando visualmente insignias como `✅ Gmail` o `✅ WhatsApp` junto a la fecha y hora.
- **Cobro Conjunto de Mensualidad y Adicional Fondo de Reserva:**
  - Cada vez que se asienta el pago de una cuota mensual de un alumno, el sistema incluye por defecto un adicional sugerido del **10%** para el **Fondo de Reserva**.
  - Este monto es **completamente editable** en cada cobro para adaptarse a la necesidad presupuestaria de cada mes o alumno.
  - Al procesar el cobro, la cuota regular ingresa a la cuenta bancaria operativa seleccionada por el usuario, y el adicional se abona automáticamente a la cuenta bancaria del **Fondo de Reserva (`CTA-02` Banco Santander)** bajo la categoría `fondo_reserva`.
- **Edición Integral de Alumnos:** Cada tarjeta y ficha de alumno cuenta con acceso directo a modificar todos sus datos básicos (Nombre, RUT, Grado Kyu/Dan, WhatsApp, Correo, Cuota mensual pactada, Día de corte, Fecha de ingreso, Estado activo/becado/inactivo y Observaciones), con sincronización reactiva en transacciones y eliminación individual controlada.
- **Cuentas Blanqueadas en Cero ($0):** Las cuentas de tesorería inician con saldo `$0` y sin transacciones de prueba precargadas. Se incorpora la función `App.openEditInitialBalance(accountId)` para que el tesorero pueda definir o ajustar el saldo de apertura real de cada fondo bancario/caja cuando se reciban los dineros oficiales.
- **Botón de Blanqueo en Caliente:** La pestaña de Cuentas & Fondos incluye el botón `App.clearAccountBalances()` para restablecer inmediatamente a `$0` todos los saldos y vaciar movimientos en caso de requerir un reinicio contable.
- **Regla Contable de Arrastre Multianual de Deudas:**
  - Al cambiar de año o seleccionar un período contable activo, las deudas no pagadas de años previos **no se extinguen ni se pierden**.
  - Se calcula el saldo total adeudado acumulado de años pasados y se mantiene el **desglose individual de cada mes histórico impago** para permitir su cobranza y conciliación específica.
- **Tarifas Individuales y Becas Municipales:** Cada alumno cuenta con un "valor mensual pactado". Para alumnos con beneficio o Beca Municipal de La Reina, el valor se define en `$0`, quedando clasificados automáticamente "Al Día" sin generar falsos cargos de morosidad.
- **Plan de Cuentas Básico Estructurado (1000 - 5000):**
  - `1000`: Infraestructura y Sede (1010 Arriendo, 1020 Servicios básicos, 1030 Mantenimiento tatami/aseo).
  - `2000`: Operación Deportiva (2010 Tatami/sacos, 2020 Implementos, 2030 Botiquín).
  - `3000`: Honorarios y Personal (3010 Sensei/Instructores, 3020 Apoyo).
  - `4000`: Eventos y Afiliaciones (4010 Federación, 4020 Torneos, 4030 Exámenes de grado).
  - `5000`: Administración y Varios (5010 Comisiones, 5020 Publicidad, 5030 Varios).
- **Conciliación de Transferencias:** Las transferencias entre cuentas descuentan de la cuenta de origen y suman a la de destino sin afectar el balance operacional del mes ni el patrimonio neto global del Dojo.
- **Intercambio de Nómina de Alumnos vía Hoja de Cálculo (CSV / Excel):**
  - **Exportación con UTF-8 BOM (`exportStudentsSpreadsheet`):** Descarga la nómina completa en CSV incluyendo el prefijo `\uFEFF` para apertura transparente en Microsoft Excel y Google Sheets con soporte nativo de caracteres en español (tildes, eñes), conteniendo campos personales, contractuales, observaciones y desglose de deudas.
  - **Importación Inteligente con Upsert (`importStudentsSpreadsheet`):** Procesa archivos CSV con detección automática de delimitador (`,`, `;` o tabulador) y normalización de encabezados. Realiza *upsert*: si el alumno ya existe por ID o RUT, actualiza sus datos básicos sin borrar ni alterar sus movimientos contables previos; si es nuevo, lo incorpora asignando ID correlativo.
  - **Ubicación Integrada:** Dispone de 2 botones dedicados (`Exportar Hoja de Cálculo` e `Importar Hoja de Cálculo`) ubicados en el modal de respaldo y recuperación (`modal-backup`) y en la cabecera de Alumnos & Mensualidades.
- **Portabilidad:** La aplicación cuenta con exportación e importación completa en formato JSON y exportación de planillas mensuales y libro diario a CSV.
- **Créditos y Pie de Página Oficial Fijo (Footer):**
  - La aplicación incorpora un footer oficial con los créditos de autoría: `"Análisis/Diseño de Andres Aguiar V AAMM.DD Santiago de Chile Mes y Año Actual - Contacto +56933395447 - Whatsapp +56933395447"`.
  - Este footer se genera como un **valor fijo inmutable** al momento de crear o modificar la aplicación (`V 2611.04 Santiago de Chile Noviembre 2026`). No se muta dinámicamente en tiempo de ejecución por fecha del cliente, manteniéndose invariable como sello de compilación/release hasta la próxima regeneración de código.
  - Se vincula a metadatos de build (`APP_BUILD_INFO`), preservando los botones administrativos del Dojo (`Vaciar Alumnos`, `Restablecer Base Limpia`) y los enlaces de llamada y WhatsApp.

---

## 3. Historial de cambios

### 2026-11-05: Intercambio de alumnos con profesor vía Hoja de Cálculo (SPEC-004)
- Implementada la especificación **SPEC-004** para intercambiar información de los miembros del club con el profesor de Karate mediante hojas de cálculo (CSV compatible con Excel y Google Sheets).
- Añadidos dos botones específicos junto a los mecanismos de respaldo y recuperación (`modal-backup`):
  1. **`[Exportar Hoja de Cálculo]`**: Genera y descarga la nómina completa de miembros con prefijo UTF-8 BOM (`\uFEFF`) para compatibilidad directa con tildes y eñes en Excel, incluyendo campos deportivos, contractuales, observaciones y resumen de deudas.
  2. **`[Importar Hoja de Cálculo]`**: Permite seleccionar y procesar archivos CSV con detección automática de delimitadores (coma, punto y coma o tabulador), normalización de encabezados flexibles y lógica *upsert* (actualiza por ID o RUT sin tocar pagos históricos o crea nuevos alumnos).
- Añadidos botones complementarios en la barra de acciones de la pestaña Alumnos & Mensualidades.
- Añadidas pruebas unitarias automatizadas 23 y 24 en `tests/dojo_accounting.test.js` (24/24 pruebas aprobadas).

### 2026-11-05: Activación de GitHub Pages y despliegue de URL remota en vivo
- Activado el servicio de **GitHub Pages** sobre la rama `main` (raíz `/`) mediante la API oficial de GitHub.
- Verificado el build y despliegue exitoso (HTTP 200) de la aplicación SPA en el dominio público:
  `https://andresaguiarmarmol.github.io/Karate/`
- Configurado el campo `homepage` del repositorio en GitHub apuntando a la URL pública y actualizado `README.md` con el enlace directo.

### 2026-11-05: Creación del repositorio oficial en GitHub y sincronización completa
- Verificada la existencia previa en GitHub y creado el repositorio oficial público: `https://github.com/AndresAguiarMarmol/Karate` con su descripción institucional.
- Reconfigurado el origen remoto de Git (`origin`) desde la plantilla original hacia `https://github.com/AndresAguiarMarmol/Karate.git`.
- Actualizado y enriquecido `README.md` con la descripción completa del sistema (gestión de alumnos, fondo de reserva 10%, emisión secuencial de 15s con cierre de sesión, plan de cuentas y pruebas automatizadas).
- Versionado completo del proyecto y publicación de la rama principal (`main`) en GitHub.

### 2026-11-04: Recorrido secuencial de deudores con separación de 15 segundos y cierre automático de sesión de correo
- Implementado el motor de recorrido secuencial con cadencia de **15 segundos** (`App.processNextSequentialEmail` y `App.sequentialDispatchState`) para la emisión de cobranza individual por Gmail a los correos afiliados.
- El sistema abre cada sesión de correo en una ventana nombrada (`dojo_billing_session`), inicia un contador regresivo de 15 segundos en pantalla con barra de progreso, y al expirar el tiempo cierra automáticamente la sesión/ventana activa (`currentWindow.close()`) antes de avanzar al siguiente deudor de la nómina.
- Se previene activamente el bloqueo heurístico de pop-ups y la saturación de memoria en navegadores modernos (Chrome, Firefox, Edge, Safari).
- Incorporado panel de control interactivo en el Asistente Modal de Emisión (`modal-individual-dispatch`):
  - Badge regresivo en vivo (`15s restantes`).
  - Barra de progreso porcentual del lote.
  - Indicador de estado y deudor activo (`Emitiendo correo X de Y`).
  - Botones de acción rápida: **Pausar / Reanudar** y **Detener**.
  - Al completar la nómina, se cierra automáticamente la última ventana de correo abierta.
- Actualizada y verificada la suite de pruebas unitarias (`tests/dojo_accounting.test.js`) con 22/22 pruebas aprobadas.

### 2026-11-04: Emisión de correos individuales personalizados en Gmail a los correos afiliados de cada miembro
- Actualizado el botón de lote a **"Todos en Gmail (Correos Individuales)"** (`dispatchBatchIndividualEmails`), el cual genera y emite una carta de cobranza individual y personalizada para cada miembro del dojo a su dirección de correo afiliada (`student.email`).
- Cada correo individual incorpora explícitamente los conceptos detallados de cobranza:
  1. **Concepto 1 (Cuota Mensualidad Tatami):** Valor pactado mensual para entrenamiento y operación regular.
  2. **Concepto 2 (Aporte Adicional Fondo de Reserva 10%):** Aporte del 10% para el fondo de reserva y equipamiento en Banco Santander (CTA-02).
  3. **Total a Pagar del Período:** Suma consolidada de cuota tatami y fondo de reserva.
  4. **Nota de Arrastre Multianual:** Detalle de saldos pendientes de meses o años previos y total acumulado si registra morosidad.
  5. **Datos Bancarios Completos:** Cuentas oficiales de Banco Estado y Banco Santander con notas de comprobante.
- Incorporado el **Asistente Modal de Emisión Individual (`modal-individual-dispatch`)** que enumera a cada atleta, muestra su desglose y ofrece botones rápidos para *"Abrir en Gmail"*, *"WhatsApp"* o *"Copiar Carta"*, resolviendo posibles bloqueos de ventanas emergentes múltiples del navegador.
- Actualizada la suite de pruebas unitarias (`tests/dojo_accounting.test.js`) con 22/22 pruebas aprobadas.
- Actualizada la generación de la carta de cobranza masiva (`generateBatchBillingDraft` y `openBatchGmailBcc`) para incorporar explícitamente todos los conceptos financieros:
  1. **Estructura y Conceptos de Cobranza:** Cuota Mensualidad Tatami (operativa), Aporte Adicional Fondo de Reserva (10%), Total a Pagar del Período y notas de Arrastre de Deudas Multianuales.
  2. **Detalle Individual de Cobranza por Alumno:** Nómina enumerada de atletas incluidos en la emisión con su RUT, grado, valor de cuota tatami, 10% de Fondo de Reserva, total del período y nota de saldo previo acumulado si registra morosidad.
  3. **Resumen Consolidado del Período:** Montos totales acumulados de cuotas tatami, fondo de reserva y total general a recaudar.
  4. **Datos Bancarios Completos:** Cuentas oficiales de Banco Estado (CTA-01) y Banco Santander (CTA-02) con indicaciones para transferencia y envío de comprobante.
- Ampliada la suite de pruebas unitarias (`tests/dojo_accounting.test.js`) a 21/21 pruebas aprobadas.

### 2026-11-04: Ejecución inmediata de cobranza programada y despacho multicanal real (Gmail, Outlook, WhatsApp)
- Implementada la regla de ejecución inmediata: si la fecha y hora programada (Día 3 a la 01:00 AM) se ha cumplido o superado en el mes y aún no se han enviado las notificaciones, el sistema ejecuta de inmediato el lote de cobranza (`executeImmediateAutomatedBilling`), registra la fecha/hora en la persistencia y notifica al usuario con un banner en el Dashboard.
- Añadido un temporizador recurrente en segundo plano (cada 60 segundos) en `App.init()` para asegurar la ejecución exacta en tiempo real si la app permanece abierta durante el cambio de hora.
- Eliminadas las alertas engañosas de "correo enviado": sustituido el antiguo `mailto:` silencioso por botones de despacho directo y 100% operativos: **Gmail Web** (pre-llenado con destinatario, asunto y desglose), **Outlook Web**, **WhatsApp** y **App Local**.
- Incorporado el botón **"Todos en Gmail (CCO)"** en el modal de programación para notificar masivamente a todos los atletas con cuotas pendientes en un solo clic desde la cuenta del usuario.
- Añadido el seguimiento del estado de despacho por atleta (`dispatchedStudents[period]`) con badges visibles `✅ Gmail`, `✅ WhatsApp`, etc. en la tabla de programación.
- Añadido el botón de acción rápida `[⚡ Ejecutar de Inmediato]` en el modal de programación para forzar la emisión bajo demanda.
- Ampliada la suite de pruebas unitarias (`tests/dojo_accounting.test.js`) a 20/20 pruebas aprobadas.
- Ajustado el pie de página oficial para que el valor `Análisis/Diseño de Andres Aguiar V 2611.04 Santiago de Chile Noviembre 2026 - Contacto +56933395447 - Whatsapp +56933395447` quede grabado de manera estática y fija en el HTML y en la constante `APP_BUILD_INFO`.
- Eliminadas las mutaciones dinámicas de fecha en tiempo de ejecución (`renderFooterCredits`), asegurando que el sello represente el momento exacto de generación de la app.
- Preservados íntegros los botones administrativos y enlaces de contacto.
- Actualizada y verificada la suite de pruebas unitarias (`tests/dojo_accounting.test.js`) con 17/17 pruebas aprobadas.

### 2026-11-02: Programación y automatización del envío de cobranza el día 3 de cada mes a las 01:00 AM
- Activada la tarea de cron recurrente en modo Daemon (`0 1 3 * *`) para notificar al agente la ejecución de la cobranza cada día 3 del mes a las 01:00 AM.
- Incorporada la estructura `settings.billingSchedule` en la persistencia con configuración de día (3), hora (01:00 AM) y estado de ejecución.
- Añadido el botón de acceso directo `[Día 3 • 01:00 AM]` en la barra de navegación superior y el banner contextual de período activo en el Dashboard.
- Creado el modal de gestión `<dialog id="modal-billing-schedule">` con tabla de atletas pendientes, montos calculados (cuotas + 10% Fondo Reserva), copiado íntegro de lote al portapapeles, exportación a TXT y marcado formal de período ejecutado.
- Actualizada y verificada la suite de pruebas unitarias (`tests/dojo_accounting.test.js`) con 16/16 pruebas aprobadas.

### 2026-11-02: Habilitación de cobranza por correo electrónico al alumno y remitente configurable
- Diseñado e implementado el modal dedicado `<dialog id="modal-email-billing">` con vista previa reactiva de cobranza.
- Añadido botón "Configurar Correo" en la barra de navegación superior con indicador visual del remitente oficial guardado.
- Añadido botón "Email" en la grilla de acciones de cada tarjeta de alumno, en la cabecera de la ficha detallada y en el modal de pago de cuota.
- Generación automática del mensaje con desglose de cuota tatami, 10% adicional sugerido de Fondo de Reserva, notas de arrastre de deuda multianual si existen cuotas previas impagas y datos de cuentas bancarias (Banco Estado CTA-01 y Banco Santander CTA-02).
- Soporte para apertura directa vía protocolo `mailto:` y botón de copiado rápido al portapapeles ("Copiar Texto") para envío por Webmail (Gmail, Outlook) o WhatsApp.
- Actualizada y verificada la suite de pruebas unitarias (`tests/dojo_accounting.test.js`) con 13/13 pruebas aprobadas.

### 2026-11-02: Cobro automático de adicional para Fondo de Reserva (10% sugerido y editable) acreditado en CTA-02
- Configurado el modal de cobranza de mensualidad con un bloque dedicado al Adicional para Fondo de Reserva.
- Cálculo automático inicial del 10% sobre la cuota mensual pactada, con campo numérico editable libremente en cada transacción.
- Acreditación automática del monto adicional en la cuenta `CTA-02` (Banco Santander - Fondo de Reserva) bajo la categoría contable `fondo_reserva`.
- Cálculo dinámico del total combinado a percibir del alumno (Cuota regular + Adicional Fondo Reserva).
- Añadidas pruebas unitarias contables automatizadas en `tests/dojo_accounting.test.js` (10/10 pruebas aprobadas).

### 2026-11-02: Habilitación de opciones para modificar datos básicos de alumnos y eliminación individual
- Agregados botones directos de edición ("Editar", icono lápiz) y eliminación en cada tarjeta del listado de Alumnos & Mensualidades.
- Integrado botón de acción "Cambiar Datos Básicos" y "Eliminar Alumno" dentro del modal de Ficha y Estado de Cuenta.
- Sincronización automática del nombre del alumno en los registros del Libro Diario al actualizar sus datos.
- Agregada la función `App.deleteStudent(studentId)` con confirmación de seguridad.
- Ampliada la suite de pruebas unitarias (`tests/dojo_accounting.test.js`) a 8/8 pruebas aprobadas cubriendo edición y eliminación.

### 2026-11-02: Blanqueo de saldos de cuentas bancarias y función de ajuste de apertura
- Blanqueados a `$0` todos los saldos iniciales de las cuentas bancarias (`CTA-01`, `CTA-02`, `CTA-03`) en `INITIAL_SEED_DATA`.
- Vaciada la lista inicial de transacciones operativas de prueba (`transactions: []`) para evitar saldos negativos y partir de un patrimonio neto real de `$0`.
- Implementada la función `App.openEditInitialBalance(accountId)` con botón "Editar" en cada tarjeta bancaria para ingresar saldos de apertura reales.
- Agregada la función `App.clearAccountBalances()` con botón interactivo "Blanquear Saldos a $0" en la cabecera de la sección de Cuentas & Fondos.
- Actualizada la persistencia a `dojo_karate_la_reina_db_v3` con purga automática de datos anteriores en el navegador.
- Actualizada y verificada la suite de pruebas unitarias (`tests/dojo_accounting.test.js`) con 6/6 pruebas aprobadas.

### 2026-11-02: Eliminación de alumnos de prueba y purga de transacciones asociadas
- Eliminados todos los alumnos de demostración (`ALU-001` a `ALU-006`) de `INITIAL_SEED_DATA.students`.
- Eliminadas todas las transacciones de pago vinculadas a los alumnos de prueba del Libro Diario.
- Actualizada la versión de almacenamiento local a `dojo_karate_la_reina_db_v2` con rutina de purga automática de datos demo remanentes en navegadores previamente abiertos.
- Agregada la función interactiva `App.clearAllStudents()` y botón "Vaciar Alumnos" en el pie de página.
- Incorporado diseño de estado vacío (Empty State) con botón directo "Inscribir Primer Alumno" en la pestaña de Alumnos & Mensualidades.
- Actualizada y verificada la suite de pruebas unitarias contables (`tests/dojo_accounting.test.js`) con 5/5 pruebas aprobadas.

### 2026-11-02: Creación de SPA/PWA Dojo Karate Municipalidad de La Reina (SPEC-003)
- Implementación completa de la aplicación en un único archivo `index.html`.
- Módulo de alumnos con semáforo inteligente (Verde: Al día, Amarillo: Por vencer, Rojo: Moroso o con arrastre).
- Motor de arrastre multianual de deudas con detalle mes a mes y saldo acumulado.
- Módulo de egresos enlazado al Plan de Cuentas Básico (1000 - 5000).
- Gestión y conciliación de cuentas (Banco Estado, Banco Santander, Caja Chica) con transferencias internas.
- Libro diario filtrable, dashboard con KPIs en tiempo real y desglose porcentual de gastos.
- Funciones de exportación CSV (alumnos y libro diario) y respaldo/restauración JSON.
- Suite de pruebas unitarias contables automatizadas en `tests/dojo_accounting.test.js` (4/4 passed).
