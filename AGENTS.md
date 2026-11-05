# AGENTS.md — Dojo de Karate La Reina

Guía para agentes de IA que trabajen en este proyecto.

## Memoria del proyecto (`memory.md`) — OBLIGATORIO
`memory.md` guarda todo lo que debe preservarse entre sesiones: la estructura de los datos (`localStorage`), las decisiones de diseño/arquitectura vigentes y el historial de cambios.

1. **Al empezar cualquier tarea:** leer `memory.md` completo antes de tocar código.
2. **Durante la tarea:** respetar la estructura de datos en `index.html` y las decisiones vigentes. Si un cambio altera la estructura de datos, asegurar que no cause excepciones ni rompa la persistencia.
3. **Al terminar cualquier tarea que cambie algo:** actualizar `memory.md`:
   - Sección 1 si cambia la estructura de datos o persistencia en `localStorage`.
   - Sección 2 si se toma, cambia o elimina una decisión arquitectónica o de diseño.
   - Sección 3: añadir arriba una entrada con la fecha y un resumen breve del cambio.
4. Si `memory.md` y el código no coinciden, avisar al usuario antes de seguir.

---

## Descripción del proyecto
Aplicación Web Progresiva (SPA / PWA) para la gestión contable, control de alumnos y emisión automatizada de cobranzas del Dojo de Karate (Municipalidad de La Reina).


---

## Stack y restricciones técnicas
- **HTML5 semántico:** `index.html` con estructura accesible y metadatos SEO/Open Graph completos.
- **Tailwind CSS via CDN:** Configurado directamente en el `<head>` de `index.html` con soporte de modo oscuro por clase (`darkMode: 'class'`).
- **CSS personalizado:** `assets/css/custom.css` para variables de tema, efectos de glassmorphism, animaciones, modales nativos y reglas críticas de impresión (`@media print`).
- **JavaScript Vanilla puro (sin compilación ni bundlers):**
  - `assets/js/data.js`: Fuente única de la verdad (**Single Source of Truth**) que contiene el objeto global `PROFILE_DATA`.
  - `assets/js/main.js`: Lógica de hidratación dinámica del DOM, gestión de tema, filtros, modales y eventos interactivos.
- **Iconografía:** Lucide Icons cargado vía CDN (`window.lucide.createIcons()`).
- **Compatibilidad directa:** Debe poder visualizarse abriendo `index.html` con doble clic (`file://`) o mediante un servidor estático ligero (`npx serve`, `python -m http.server`).

---

## Estilo de código y buenas prácticas
- **Separación estricta de responsabilidades:**
  - Los datos y textos viven en `assets/js/data.js`. No cablear información personal o profesional en duro en `index.html` si corresponde al perfil.
  - El renderizado e interactividad vive en `assets/js/main.js`.
  - Los estilos de apoyo e impresión viven en `assets/css/custom.css`.
- **Accesibilidad:** Uso de `<dialog>` nativo para modales, etiquetas accesibles (`aria-*`) y contraste que cumpla WCAG AA tanto en modo claro como en modo oscuro.
- **Diseño Mobile-First y Responsivo:** Todos los componentes deben verse y comportarse de forma impecable en pantallas pequeñas (móviles) y monitores de escritorio.
- **Rigor en la impresión:** Cada ajuste visual que afecte a secciones clave debe comprobarse contra `@media print` para evitar saltos de página inadecuados o fondos oscuros que gasten tinta.

---

## Cómo probar
1. **Navegación general:** Abrir `index.html` en el navegador y verificar que la consola no tenga errores ni advertencias.
2. **Tema Claro / Oscuro:** Probar el botón de cambio de tema (en escritorio y en menú móvil) y comprobar que persista al recargar la página (`localStorage.getItem('theme')`).
3. **Filtros de proyectos:** Probar los botones de filtro en la sección de proyectos (Todos, IA, Python, Sistemas Core, etc.) y abrir modales de detalle STAR comprobando cierre con botón ✖, fondo o Escape.
4. **Validación de certificaciones:** Probar los enlaces para abrir certificados oficiales en PDF y páginas de validación.
5. **Comprobación de impresión (PDF):** Presionar `Ctrl + P` o el botón "Descargar CV" para verificar la previsualización del documento impreso.
6. **Vista móvil:** Probar con la herramienta de emulación móvil de DevTools (375x667px o 390x844px) comprobando el menú hamburguesa.

---

## Formato de respuesta al terminar una tarea
- Resumen de 3-4 líneas de lo creado o cambiado.
- Pasos para probarlo.
- Decisiones tomadas por cuenta propia que el usuario deba revisar.
- Confirmar que `memory.md` se ha actualizado.
