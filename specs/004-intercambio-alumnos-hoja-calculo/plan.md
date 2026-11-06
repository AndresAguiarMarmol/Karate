# PLAN-004: Plan de Implementación de Intercambio de Alumnos vía Hoja de Cálculo

## 1. Arquitectura de Componentes

### A. Parser y Serializador CSV en `index.html` (Objeto `App`)
1. **`parseCSV(text)`**:
   - Detecta delimitador predominante (`,`, `;` o `\t`) a partir de la primera línea (cabecera).
   - Divide en tokens respetando comillas dobles balanceadas.
   - Retorna un arreglo de objetos con llaves normalizadas (`name`, `rut`, `grade`, `phone`, `email`, `monthlyfee`, `dueday`, `startdate`, `status`, `notes`).
2. **`exportStudentsSpreadsheet()`**:
   - Compila la nómina completa en formato CSV estándar.
   - Incluye el prefijo UTF-8 BOM (`\uFEFF`) y cabeceras claras.
   - Ejecuta `this.triggerDownload(csvContent, filename, 'text/csv;charset=utf-8;')`.
3. **`importStudentsSpreadsheet(fileOrText)`**:
   - Procesa el archivo subido a través de `FileReader`.
   - Realiza *upsert* en `this.db.students` según `id` o `rut`.
   - Guarda con `this.saveDatabase()`, actualiza con `this.renderAll()` y muestra feedback detallado.

### B. Interfaz de Usuario (UI)
1. **Modal de Respaldo (`modal-backup`):**
   - Actualizar el título a *"Respaldo, Recuperación e Intercambio de Datos"*.
   - Añadir tarjeta diferenciada con fondo verde suave / borde esmeralda con icono `file-spreadsheet`.
   - Controles:
     - Botón `[Exportar Alumnos a Hoja de Cálculo]`
     - Campo de selección `.csv` (`id="import-students-spreadsheet-file"`)
     - Botón `[Cargar e Importar Alumnos]`
2. **Módulo Alumnos & Mensualidades (Barra superior de acciones):**
   - Agregar botón `[Importar Hoja de Cálculo]` al lado del botón `[Exportar Planilla]`, vinculando al modal de respaldo o disparando el input de importación.

---

## 2. Plan de Pruebas Automatizadas
1. **Prueba 23:** Exportación a CSV con formato enriquecido, UTF-8 BOM y todos los campos del alumno.
2. **Prueba 24:** Importación desde CSV con auto-detección de delimitadores (coma y punto y coma), creación de alumnos nuevos y actualización de alumnos existentes sin duplicar ni romper integridad contable.
