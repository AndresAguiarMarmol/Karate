# SPEC-004: Intercambio de Información de Alumnos con Profesor vía Hoja de Cálculo (Importar / Exportar CSV / Excel)

## 1. Contexto y Justificación
El administrador del Dojo de Karate (Municipalidad de La Reina) necesita intercambiar periódicamente información de los miembros del club (atletas/alumnos) con el profesor de Karate mediante un medio universal y accesible: una **hoja de cálculo** (compatible con Microsoft Excel, Google Sheets y LibreOffice Calc).

Para ello, la aplicación debe ofrecer dos mecanismos enlazados a través de dos botones dedicados:
1. **Exportar a Hoja de Cálculo:** Descarga la nómina completa de miembros con sus datos personales, deportivos, contractuales y estado de deudas, formateado con UTF-8 BOM para apertura nativa e inmediata en Excel sin errores de codificación de caracteres en español.
2. **Importar desde Hoja de Cálculo:** Permite seleccionar un archivo CSV/Excel editado por el profesor e incorporar o actualizar automáticamente a los miembros del club mediante lógica *upsert* (actualizar si ya existe por ID o RUT, crear nuevo si no existe), preservando el historial contable y recalculando el estado financiero.

Estos botones deben situarse junto a los mecanismos existentes de respaldo y recuperación (`modal-backup` y barras de acción de alumnos).

---

## 2. Requerimientos Funcionales

### RF-01: Exportación a Hoja de Cálculo (`exportStudentsSpreadsheet`)
- **Estructura de Columnas:**
  1. `ID` (Identificador único, ej. `ALU-001`)
  2. `Nombre` (Nombre completo del alumno)
  3. `RUT` (RUT o identificación oficial)
  4. `Grado` (Cinturón / Kyu / Dan)
  5. `Telefono` (WhatsApp / contacto)
  6. `Email` (Correo electrónico afiliado para cobranzas)
  7. `ValorMensual` (Cuota mensual pactada en CLP)
  8. `DiaCorte` (Día de vencimiento de pago mensual, 1-31)
  9. `FechaIngreso` (Fecha de incorporación ISO `YYYY-MM-DD`)
  10. `Estado` (`activo`, `becado`, `inactivo`)
  11. `Observaciones` (Notas técnicas o médicas del atleta)
  12. `DeudaHistoricaArrastrada` (Saldo acumulado de años previos)
  13. `DeudaAnioActivo` (Monto pendiente del año en curso)
  14. `DeudaTotal` (Total consolidado a la fecha)
- **Codificación y Delimitación:**
  - Prefijo **UTF-8 BOM (`\uFEFF`)** obligatorio para que Excel y Sheets abran tildes y eñes correctamente.
  - Delimitador estándar comas (`,`) con escape de comillas dobles (`""`).
  - Nombre de archivo descriptivo con fecha: `nomina_alumnos_dojo_karate_YYYY-MM-DD.csv`.

### RF-02: Importación desde Hoja de Cálculo (`importStudentsSpreadsheet`)
- **Compatibilidad de Entrada:**
  - Archivos `.csv` delimitados por coma (`,`) o punto y coma (`;`), detectado automáticamente.
  - Soporte de valores entrecomillados que contengan comas o saltos de línea.
  - Tolerancia de encabezados flexibles (insensible a mayúsculas/minúsculas y tildes: `nombre`, `rut`, `grado`, `cinturón`, `email`, `correo`, `teléfono`, `cuota`, `valor mensual`, `vencimiento`, `día corte`, `estado`, `observaciones`).
- **Lógica de Integración (Upsert):**
  - **Coincidencia:** Se busca alumno existente por coincidencia de `id` o coincidencia de `rut` limpio.
  - **Actualización:** Si coincide, se actualizan los datos básicos (nombre, grado, teléfono, email, valorMensual, diaCorte, estado, notas, fechaIngreso si aplica) sin alterar sus pagos históricos ni borrar registros del libro diario.
  - **Alta de Nuevo Alumno:** Si no existe, se genera un nuevo alumno asignándole un ID correlativo o el ID provisto, inicializando sus cuotas correspondientes.
- **Validación y Resumen:**
  - Notifica cuántos registros fueron procesados, cuántos alumnos nuevos fueron agregados y cuántos actualizados.
  - Persiste inmediatamente en `localStorage` (`App.saveDatabase()`) y redibuja la interfaz (`App.renderAll()`).

### RF-03: Ubicación de los Botones de Intercambio
- **Modal de Respaldo y Recuperación (`modal-backup`):**
  - Incorporar una sección dedicada y destacada: *"Intercambio de Alumnos con Profesor (Hoja de Cálculo / Excel)"*.
  - Botón verde/esmeralda: `[Exportar Alumnos a Hoja de Cálculo]`.
  - Selector de archivo y botón celeste/azul: `[Importar Alumnos desde Hoja de Cálculo]`.
- **Barra de Acciones de Alumnos:**
  - Incorporar botón directo de Importar Hoja de Cálculo junto al botón existente de Exportar en la cabecera del módulo de Alumnos & Mensualidades.

---

## 3. Requerimientos No Funcionales y Restricciones
- **SPA Autocontenida:** Sin dependencias externas ni compiladores pesados; parser implementado en JavaScript Vanilla puro.
- **Seguridad e Integridad:** Los datos de transacciones contables, pagos y cuentas bancarias NO deben corromperse ni eliminarse durante la importación.
- **Compatibilidad Multiplataforma:** Debe funcionar en navegadores de escritorio y móviles sin alterar ninguna otra funcionalidad de la app.
- **Pruebas Automatizadas:** Mínimo 2 pruebas unitarias adicionales en `tests/dojo_accounting.test.js` que verifiquen la exportación e importación de nómina de alumnos vía hoja de cálculo.

