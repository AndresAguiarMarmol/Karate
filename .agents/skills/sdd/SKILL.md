---
name: control-caja-dojo-karate
description: Registra, clasifica y concilia ingresos (mensualidades, matrículas, exámenes de grado, indumentaria) y egresos (arriendo, servicios, federación, equipamiento) para un Dojo de Karate. Genera balances periódicos y estructuras JSON para contabilidad o bases de datos locales.
---

# Control de Ingresos y Egresos - Dojo de Karate

Esta skill gestiona la tesorería y el flujo de caja operativo de un dojo de karate tradicional o deportivo. Procesa notas rápidas, recibos, transferencias y listas de pagos para generar asientos estructurados, cálculos de balance y alertas de morosidad o vencimientos.

## Cuándo Usar

* Al registrar pagos de alumnos por mensualidad, matrícula anual o derecho a examen de pase de cinturón.
* Al asentar ventas de karategis (dogis), cinturones (obis), protecciones (guantines, canilleras, cabezales) o parches oficiales.
* Al registrar egresos operativos del dojo: arriendo del tatami/local, servicios básicos, cuotas federativas o mantenimiento de implementos (sacos, makiwaras).
* Para generar balances de caja chica diarios, semanales o mensuales en formato JSON y tablas legibles.

---

## Taxonomía Contable del Dojo

### 1. Categorías de Ingresos (`tipo: "ingreso"`)

* `mensualidad`: Cuota periódica por clases (infantil, juvenil, adultos, competidores).
* `matricula`: Inscripción inicial o renovación anual de membresía.
* `derecho_examen`: Arancel de examen de grado (Kyu o Dan), incluye emisión de certificado.
* `indumentaria_equipamiento`: Venta de karategis, cinturones, guantillas, bucales, pecheras.
* `seminarios_eventos`: Entradas a clínicas técnicas, cursos de arbitraje o torneos organizados por el dojo.
* `otros_ingresos`: Donaciones, patrocinios o arriendo temporal del tatami a otras disciplinas.

### 2. Categorías de Egresos (`tipo: "egreso"`)

* `arriendo_espacio`: Canon de arriendo del dojo o cuota de mantenimiento de instalaciones.
* `servicios_basicos`: Luz, agua, internet, gas para duchas.
* `afiliacion_federacion`: Cuotas a la federación, asociación nacional o internacional de estilo (WKF, JKA, Shito-ryu, Goju-ryu, etc.).
* `honorarios_sensei`: Pagos a instructores auxiliares o profesores invitados.
* `compra_inventario`: Adquisición al por mayor de dogis, cinturones o protecciones para reventa.
* `mantenimiento_implementacion`: Reparación de tatamis, compra de desinfectante, limpieza, renovación de mits o escudos de impacto.
* `viaticos_torneos`: Inscripciones federativas a campeonatos, transporte o estadía de competidores del dojo.

---

## Reglas de Procesamiento y Validación

1. **Estandarización de Fechas:** Todas las fechas deben registrarse en formato ISO-8601 (`YYYY-MM-DD`). Si solo se indica el día en un contexto mensual, asumir el mes y año en curso.
2. **Métodos de Pago Aceptados:** Clasificar en `transferencia`, `efectivo`, `tarjeta_debito`, `tarjeta_credito` o `cheque`.
3. **Cálculo de Balance:**
   $$\text{Saldo Final} = \text{Saldo Inicial} + \sum \text{Ingresos} - \sum \text{Egresos}$$
4. **Validación de Grados (Exámenes):** Cuando se registre un cobro por derecho de examen, documentar siempre el grado actual y el grado al que postula (ej. *De 4° Kyu a 3° Kyu*).
5. **Formato Numérico:** Moneda local (ej. CLP, USD, EUR) expresada en enteros o flotantes limpios sin símbolos ni separadores de miles engañosos en los valores del JSON.

---

## Formato de Salida

La respuesta debe entregar siempre un **objeto JSON estructurado** (apto para alimentar SQLite, Google Sheets o scripts en Python/JS) seguido de un **resumen ejecutivo en Markdown** para visualización rápida.

### Esquema JSON

```json
{
  "periodo": "YYYY-MM",
  "fecha_registro": "YYYY-MM-DD",
  "moneda": "CLP",
  "transacciones": [
    {
      "id": "TX-001",
      "tipo": "ingreso | egreso",
      "categoria": "mensualidad | derecho_examen | indumentaria_equipamiento | arriendo_espacio | otros",
      "fecha": "YYYY-MM-DD",
      "alumno_o_beneficiario": "Nombre de la persona o entidad",
      "grado_alumno": "Cinturon / Kyu / Dan o null",
      "concepto": "Detalle descriptivo de la operacion",
      "metodo_pago": "transferencia | efectivo | tarjeta_debito | tarjeta_credito",
      "comprobante_ref": "Numero de operacion, boleta o null",
      "monto": 0.00
    }
  ],
  "balance_caja": {
    "total_ingresos": 0.00,
    "total_egresos": 0.00,
    "saldo_neto": 0.00
  },
  "alertas": [
    "Avisos de atrasos reiterados, gastos inusualmente altos o inventario crítico"
  ]
}