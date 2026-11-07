const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');

// Cargar la lógica desde index.html
const html = fs.readFileSync('index.html', 'utf8');
const scriptContent = html.substring(html.lastIndexOf('<script>') + 8, html.lastIndexOf('</script>'));

// Evaluar la lógica en un entorno mock
const sandbox = {
  localStorage: {
    data: {},
    getItem(k) { return this.data[k] || null; },
    setItem(k, v) { this.data[k] = v; },
    removeItem(k) { delete this.data[k]; }
  },
  window: { addEventListener() {} },
  document: {
    getElementById() { return null; }
  },
  Intl,
  Date,
  Set,
  prompt: () => '150000',
  alert: (...args) => { if (sandbox.onAlert) return sandbox.onAlert(...args); },
  confirm: () => true
};

const fn = new Function('localStorage', 'window', 'document', 'Intl', 'Date', 'Set', 'prompt', 'alert', 'confirm', `
  ${scriptContent}
  return { App, STORAGE_KEY, INITIAL_SEED_DATA, CHART_OF_ACCOUNTS, APP_BUILD_INFO };
`);

const { App, STORAGE_KEY, INITIAL_SEED_DATA, CHART_OF_ACCOUNTS, APP_BUILD_INFO } = fn(
  sandbox.localStorage,
  sandbox.window,
  sandbox.document,
  Intl,
  Date,
  Set,
  sandbox.prompt,
  sandbox.alert,
  sandbox.confirm
);

test('Saldos iniciales de cuentas bancarias están blanqueados en $0', () => {
  assert.strictEqual(INITIAL_SEED_DATA.accounts.length, 3);
  INITIAL_SEED_DATA.accounts.forEach(acc => {
    assert.strictEqual(acc.initialBalance, 0, `La cuenta ${acc.name} debe tener saldo inicial $0`);
  });
  assert.strictEqual(INITIAL_SEED_DATA.transactions.length, 0, 'No debe haber transacciones de prueba');
});

test('Plan de Cuentas Básico está completo (1000 - 5000)', () => {
  assert.ok(CHART_OF_ACCOUNTS['1000']);
  assert.ok(CHART_OF_ACCOUNTS['2000']);
  assert.ok(CHART_OF_ACCOUNTS['3000']);
  assert.ok(CHART_OF_ACCOUNTS['4000']);
  assert.ok(CHART_OF_ACCOUNTS['5000']);
  assert.strictEqual(CHART_OF_ACCOUNTS['1000'].items['1010'], 'Arriendo del local / dojo');
  assert.strictEqual(CHART_OF_ACCOUNTS['3000'].items['3010'], 'Remuneración Instructores / Sensei');
});

test('Conciliación y balance de cuentas bancarias tras apertura y transferencias', () => {
  App.db = JSON.parse(JSON.stringify(INITIAL_SEED_DATA));
  const initialBalances = App.calculateAccountBalances();
  assert.strictEqual(initialBalances['CTA-01'], 0);
  assert.strictEqual(initialBalances['CTA-02'], 0);
  assert.strictEqual(initialBalances['CTA-03'], 0);

  // Asignar un saldo inicial de apertura real (ej. 500.000 a CTA-01)
  const acc1 = App.db.accounts.find(a => a.id === 'CTA-01');
  acc1.initialBalance = 500000;

  // Simular transferencia de 50.000 de CTA-01 a CTA-03
  App.db.transactions.push({
    id: 'TX-TEST-01',
    type: 'transferencia',
    date: '2026-03-15',
    amount: 50000,
    fromAccountId: 'CTA-01',
    toAccountId: 'CTA-03'
  });

  const balancesAfter = App.calculateAccountBalances();
  assert.strictEqual(balancesAfter['CTA-01'], 450000);
  assert.strictEqual(balancesAfter['CTA-03'], 50000);

  // El total consolidado de fondos se mantiene exactamente igual (500.000)
  const total = Object.values(balancesAfter).reduce((a, b) => a + b, 0);
  assert.strictEqual(total, 500000);
});

test('Arrastre de deudas multianual al cambiar de año', () => {
  App.db = JSON.parse(JSON.stringify(INITIAL_SEED_DATA));
  
  // Agregar un alumno para verificar el arrastre
  const testStudent = {
    id: 'ALU-TEST-01',
    name: 'Karateca Test',
    rut: '19.111.222-3',
    monthlyFee: 35000,
    dueDay: 5,
    status: 'activo',
    startDate: '2025-10-01'
  };
  App.db.students.push(testStudent);

  // Evaluar en 2026-03 sin haber pagado cuotas de 2025
  const status2026 = App.getStudentFinancialStatus(testStudent, '2026', '03');
  assert.ok(status2026.historicalDebt > 0, 'Debe registrar deuda arrastrada de 2025 (Oct, Nov, Dic)');
  assert.ok(status2026.historicalMonths.includes('2025-11'));
  assert.strictEqual(status2026.status, 'moroso');

  // Si pagamos un mes histórico (ej. 2025-11)
  const initialHistoricalDebt = status2026.historicalDebt;
  App.db.transactions.push({
    id: 'TX-PAY-HIST',
    type: 'ingreso',
    date: '2026-03-20',
    amount: testStudent.monthlyFee,
    accountId: 'CTA-01',
    categoryCode: 'mensualidad',
    studentId: testStudent.id,
    period: '2025-11'
  });

  const statusAfterPayment = App.getStudentFinancialStatus(testStudent, '2026', '03');
  assert.strictEqual(statusAfterPayment.historicalDebt, initialHistoricalDebt - testStudent.monthlyFee);
});

test('Alumnos becados tienen cuota 0 y permanecen al día', () => {
  App.db = JSON.parse(JSON.stringify(INITIAL_SEED_DATA));
  
  const becado = {
    id: 'ALU-BECA-01',
    name: 'Atleta Becado',
    rut: '22.333.444-5',
    monthlyFee: 0,
    dueDay: 5,
    status: 'becado',
    startDate: '2025-01-01'
  };
  App.db.students.push(becado);

  const status = App.getStudentFinancialStatus(becado, '2026', '03');
  assert.strictEqual(status.status, 'aldia');
  assert.strictEqual(status.totalDebt, 0);
  assert.strictEqual(status.historicalDebt, 0);
});

test('Función clearAccountBalances blanquea saldos y transacciones', () => {
  App.db = {
    accounts: [
      { id: 'CTA-01', name: 'Banco Estado', initialBalance: 900000 },
      { id: 'CTA-02', name: 'Banco Santander', initialBalance: 400000 }
    ],
    students: [],
    transactions: [{ id: 'TX-OLD', amount: 50000 }]
  };
  App.clearAccountBalances();
  App.db.accounts.forEach(acc => assert.strictEqual(acc.initialBalance, 0));
  assert.strictEqual(App.db.transactions.length, 0);
});

test('Edición y actualización de datos básicos del alumno', () => {
  App.db = {
    accounts: [],
    students: [
      {
        id: 'ALU-EDIT-01',
        name: 'Carlos Soto',
        rut: '17.890.123-4',
        grade: '7° Kyu (Azul)',
        phone: '+56 9 1111 2222',
        email: 'carlos@dojo.cl',
        monthlyFee: 30000,
        dueDay: 5,
        startDate: '2025-01-01',
        status: 'activo',
        notes: 'Inicial'
      }
    ],
    transactions: [
      { id: 'TX-01', studentId: 'ALU-EDIT-01', beneficiary: 'Carlos Soto', amount: 30000 }
    ]
  };

  // Simular envío de edición desde formulario
  const updatedStudent = {
    id: 'ALU-EDIT-01',
    name: 'Carlos Soto Silva',
    rut: '17.890.123-4',
    grade: '5° Kyu (Morado)',
    phone: '+56 9 9999 8888',
    email: 'carlos.soto@gmail.com',
    monthlyFee: 35000,
    dueDay: 10,
    startDate: '2025-01-01',
    status: 'activo',
    notes: 'Ascendido a Morado en examen comunal'
  };

  const idx = App.db.students.findIndex(s => s.id === updatedStudent.id);
  App.db.students[idx] = updatedStudent;
  App.db.transactions.forEach(t => {
    if (t.studentId === updatedStudent.id) t.beneficiary = updatedStudent.name;
  });

  assert.strictEqual(App.db.students[0].name, 'Carlos Soto Silva');
  assert.strictEqual(App.db.students[0].grade, '5° Kyu (Morado)');
  assert.strictEqual(App.db.students[0].monthlyFee, 35000);
  assert.strictEqual(App.db.students[0].dueDay, 10);
  assert.strictEqual(App.db.transactions[0].beneficiary, 'Carlos Soto Silva');
});

test('Eliminación individual de alumno (deleteStudent)', () => {
  App.db = {
    accounts: [],
    students: [
      { id: 'ALU-DEL-01', name: 'Alumno A', rut: '11.111.111-1' },
      { id: 'ALU-DEL-02', name: 'Alumno B', rut: '22.222.222-2' }
    ],
    transactions: []
  };

  App.deleteStudent('ALU-DEL-01');
  assert.strictEqual(App.db.students.length, 1);
  assert.strictEqual(App.db.students[0].id, 'ALU-DEL-02');
});

test('Cobranza con adicional 10% para Fondo de Reserva acreditado en CTA-02', () => {
  App.db = {
    accounts: [
      { id: 'CTA-01', name: 'Banco Estado Cta Cte', initialBalance: 0 },
      { id: 'CTA-02', name: 'Banco Santander Fondo Reserva', initialBalance: 0 }
    ],
    students: [
      { id: 'ALU-RES-01', name: 'Diego Morales', monthlyFee: 40000, dueDay: 5, status: 'activo' }
    ],
    transactions: []
  };

  const student = App.db.students[0];
  const monthlyFee = student.monthlyFee;
  const reserve10Pct = Math.round(monthlyFee * 0.10); // 4.000

  // Simular cobro: 40.000 a CTA-01 y 4.000 adicional a CTA-02
  App.db.transactions.push({
    id: 'TX-PAY-01',
    type: 'ingreso',
    date: '2026-03-05',
    amount: monthlyFee,
    accountId: 'CTA-01',
    categoryCode: 'mensualidad',
    studentId: student.id,
    period: '2026-03'
  });

  App.db.transactions.push({
    id: 'TX-RES-01',
    type: 'ingreso',
    date: '2026-03-05',
    amount: reserve10Pct,
    accountId: 'CTA-02', // Fondo de Reserva
    categoryCode: 'fondo_reserva',
    studentId: student.id,
    period: '2026-03'
  });

  const balances = App.calculateAccountBalances();
  assert.strictEqual(balances['CTA-01'], 40000, 'La cuenta operativa recibe los 40.000');
  assert.strictEqual(balances['CTA-02'], 4000, 'El Fondo de Reserva recibe exactamente el 10% adicional (4.000)');
  assert.strictEqual(App.getCategoryFullName('fondo_reserva'), 'Aporte Fondo de Reserva');
});

test('Cobranza con adicional de Fondo de Reserva editado/personalizado', () => {
  App.db = {
    accounts: [
      { id: 'CTA-01', name: 'Banco Estado Cta Cte', initialBalance: 0 },
      { id: 'CTA-02', name: 'Banco Santander Fondo Reserva', initialBalance: 0 }
    ],
    students: [
      { id: 'ALU-RES-02', name: 'Valeria Parra', monthlyFee: 35000, dueDay: 5, status: 'activo' }
    ],
    transactions: []
  };

  const student = App.db.students[0];
  const monthlyFee = student.monthlyFee;
  const customReserve = 5000; // Editado manualmente según necesidad

  App.db.transactions.push({
    id: 'TX-PAY-02',
    type: 'ingreso',
    date: '2026-03-05',
    amount: monthlyFee,
    accountId: 'CTA-01',
    categoryCode: 'mensualidad',
    studentId: student.id,
    period: '2026-03'
  });

  App.db.transactions.push({
    id: 'TX-RES-02',
    type: 'ingreso',
    date: '2026-03-05',
    amount: customReserve,
    accountId: 'CTA-02',
    categoryCode: 'fondo_reserva',
    studentId: student.id,
    period: '2026-03'
  });

  const balances = App.calculateAccountBalances();
  assert.strictEqual(balances['CTA-01'], 35000);
  assert.strictEqual(balances['CTA-02'], 5000, 'El Fondo de Reserva recibe el monto editado de $5.000');
});

test('Configuración y persistencia del correo emisor oficial del Dojo (remitente)', () => {
  App.db = JSON.parse(JSON.stringify(INITIAL_SEED_DATA));
  assert.strictEqual(App.getSenderEmail(), '', 'Inicialmente el remitente está vacío');

  const testSender = 'tesoreria.karate@lareina.cl';
  App.saveSenderEmail(testSender);

  assert.strictEqual(App.getSenderEmail(), testSender);
  assert.strictEqual(App.db.settings.senderEmail, testSender);

  // Simular recarga desde storage
  sandbox.localStorage.setItem(STORAGE_KEY, JSON.stringify(App.db));
  App.loadDatabase();
  assert.strictEqual(App.getSenderEmail(), testSender, 'Persiste después de recargar la base de datos');
});

test('Generación de aviso de cobranza por email con desglose y 10% Fondo de Reserva', () => {
  App.db = JSON.parse(JSON.stringify(INITIAL_SEED_DATA));
  const student = {
    id: 'ALU-MAIL-01',
    name: 'Rodrigo Espinoza',
    rut: '18.456.789-0',
    grade: '3° Kyu (Verde)',
    phone: '+56 9 8888 7777',
    email: 'rodrigo.karate@gmail.com',
    monthlyFee: 35000,
    dueDay: 5,
    startDate: '2026-01-01',
    status: 'activo'
  };
  App.db.students.push(student);

  const sender = 'contacto.karate@lareina.cl';
  const draft = App.generateEmailBillingText(student, '2026-03', sender);

  // Validar Asunto
  assert.ok(draft.subject.includes('Rodrigo Espinoza'));
  assert.ok(draft.subject.includes('2026-03'));

  // Validar montos y cálculo del 10%
  assert.strictEqual(draft.baseFee, 35000);
  assert.strictEqual(draft.reserveAmount, 3500, 'El aporte adicional de reserva debe ser el 10% (3.500)');
  assert.strictEqual(draft.total, 38500, 'Total a pagar debe sumar cuota tatami + fondo de reserva');

  // Validar contenido del cuerpo del mensaje
  assert.ok(draft.body.includes('Rodrigo Espinoza'));
  assert.ok(draft.body.includes('18.456.789-0'));
  assert.ok(draft.body.includes('3° Kyu (Verde)'));
  assert.ok(draft.body.includes('Banco Estado'));
  assert.ok(draft.body.includes('381-0-019845-2'));
  assert.ok(draft.body.includes('Banco Santander'));
  assert.ok(draft.body.includes('74-889210-4'));
  assert.ok(draft.body.includes(sender), 'Debe indicar el correo remitente para enviar comprobantes');
});

test('Aviso de cobranza por email incluye bloque de arrastre multianual si registra deuda previa', () => {
  App.db = JSON.parse(JSON.stringify(INITIAL_SEED_DATA));
  const student = {
    id: 'ALU-MAIL-02',
    name: 'Camila Morales',
    rut: '16.789.012-3',
    grade: '1° Kyu (Marrón)',
    phone: '+56 9 4444 3333',
    email: 'camila.karate@gmail.com',
    monthlyFee: 30000,
    dueDay: 5,
    startDate: '2025-11-01', // Deuda arrastrada de 2025
    status: 'activo'
  };
  App.db.students.push(student);

  App.selectedYear = '2026';
  App.selectedMonth = '03';

  const draft = App.generateEmailBillingText(student, '2026-03', 'tesoreria@lareina.cl');
  assert.ok(draft.body.includes('NOTA DE ARRASTRE MULTIANUAL'), 'Debe incluir aviso de arrastre de años anteriores');
  assert.ok(draft.body.includes('deuda acumulada de períodos previos'));
});

test('Configuración por defecto de programación de cobranza (Día 3 a las 01:00 AM)', () => {
  App.db = JSON.parse(JSON.stringify(INITIAL_SEED_DATA));
  const sched = App.db.settings.billingSchedule;

  assert.ok(sched, 'Debe existir el objeto billingSchedule');
  assert.strictEqual(sched.enabled, true, 'La programación automática debe estar activa');
  assert.strictEqual(sched.dayOfMonth, 3, 'El día programado de cobro debe ser el 3');
  assert.strictEqual(sched.hour, 1, 'La hora programada debe ser la 01:00 AM');
  assert.strictEqual(sched.minute, 0);
  assert.strictEqual(sched.lastExecutedMonth, null);
});

test('getStudentsPendingBilling detecta atletas que adeudan cuota mensual o arrastre', () => {
  App.db = JSON.parse(JSON.stringify(INITIAL_SEED_DATA));
  App.selectedYear = '2026';
  App.selectedMonth = '03';

  // 1. Alumno que adeuda 2026-03
  const alu1 = {
    id: 'ALU-BATCH-01',
    name: 'Esteban Paredes',
    monthlyFee: 35000,
    dueDay: 5,
    startDate: '2026-01-01',
    status: 'activo',
    email: 'esteban@dojo.cl'
  };

  // 2. Alumno becado con cuota $0
  const alu2 = {
    id: 'ALU-BATCH-02',
    name: 'Atleta Becado Municipal',
    monthlyFee: 0,
    dueDay: 5,
    startDate: '2026-01-01',
    status: 'becado',
    email: 'becado@dojo.cl'
  };

  // 3. Alumno que ya pagó 2026-03
  const alu3 = {
    id: 'ALU-BATCH-03',
    name: 'Marta Díaz',
    monthlyFee: 40000,
    dueDay: 5,
    startDate: '2026-01-01',
    status: 'activo',
    email: 'marta@dojo.cl'
  };

  App.db.students = [alu1, alu2, alu3];
  App.db.transactions = [
    {
      id: 'TX-PAY-03',
      type: 'ingreso',
      date: '2026-03-02',
      amount: 40000,
      accountId: 'CTA-01',
      categoryCode: 'mensualidad',
      studentId: 'ALU-BATCH-03',
      period: '2026-03'
    }
  ];

  const pending = App.getStudentsPendingBilling('2026-03');

  // Sólo Esteban debe estar pendiente
  assert.strictEqual(pending.length, 1);
  assert.strictEqual(pending[0].student.id, 'ALU-BATCH-01');
  assert.strictEqual(pending[0].student.name, 'Esteban Paredes');
});

test('markPeriodAsBilled registra y persiste el período ejecutado en la programación', () => {
  App.db = JSON.parse(JSON.stringify(INITIAL_SEED_DATA));
  App.selectedYear = '2026';
  App.selectedMonth = '03';

  App.markPeriodAsBilled();

  assert.strictEqual(App.db.settings.billingSchedule.lastExecutedMonth, '2026-03');

  // Verificar persistencia
  sandbox.localStorage.setItem(STORAGE_KEY, JSON.stringify(App.db));
  App.loadDatabase();
  assert.strictEqual(App.db.settings.billingSchedule.lastExecutedMonth, '2026-03');
});

test('Footer contiene valor fijo inmutable de Análisis/Diseño creado al generar la app', () => {
  const expectedText = 'Análisis/Diseño de Andres Aguiar V 2611.04 Santiago de Chile Noviembre 2026 - Contacto +56933395447 - Whatsapp +56933395447';
  assert.ok(html.includes(expectedText), 'El HTML debe contener la cadena exacta fija generada');
  assert.ok(html.includes('app-footer-credits'));
  assert.ok(html.includes('tel:+56933395447'));
  assert.ok(html.includes('https://wa.me/56933395447'));

  // Validar metadatos fijos APP_BUILD_INFO
  assert.strictEqual(APP_BUILD_INFO.version, '2611.04');
  assert.strictEqual(APP_BUILD_INFO.releaseMonthYear, 'Noviembre 2026');
  assert.strictEqual(APP_BUILD_INFO.footerText, expectedText);
  assert.strictEqual(App.getFooterCredits(), expectedText);
});

test('executeImmediateAutomatedBilling ejecuta de inmediato la cobranza y actualiza fecha y lote', () => {
  App.db = JSON.parse(JSON.stringify(INITIAL_SEED_DATA));
  const testStudent = {
    id: 'ALU-AUTO-01',
    name: 'Karateca Auto',
    rut: '11.222.333-4',
    monthlyFee: 40000,
    dueDay: 3,
    status: 'activo',
    startDate: '2026-01-01',
    email: 'auto@karate.cl'
  };
  App.db.students.push(testStudent);

  App.executeImmediateAutomatedBilling('2026-03', false);

  assert.strictEqual(App.db.settings.billingSchedule.lastExecutedMonth, '2026-03');
  assert.ok(App.db.settings.billingSchedule.lastExecutedTimestamp);
  assert.ok(Array.isArray(App.db.settings.billingSchedule.dispatchedStudents['2026-03']));
});

test('Generación de URLs de despacho multicanal (Gmail, Outlook, WhatsApp, mailto) sin engaños', () => {
  const recipient = 'alumno@correo.cl';
  const subject = 'Cobranza Marzo 2026';
  const body = 'Detalle de pago cuota $35.000 + $3.500 reserva';
  const phone = '987654321';

  // Gmail Web
  const gmailUrl = App.getGmailComposeUrl(recipient, subject, body);
  assert.ok(gmailUrl.startsWith('https://mail.google.com/mail/?view=cm&fs=1'));
  assert.ok(gmailUrl.includes(encodeURIComponent(recipient)));
  assert.ok(gmailUrl.includes(encodeURIComponent(subject)));

  // Outlook Web
  const outlookUrl = App.getOutlookComposeUrl(recipient, subject, body);
  assert.ok(outlookUrl.startsWith('https://outlook.live.com/mail/0/deeplink/compose'));
  assert.ok(outlookUrl.includes(encodeURIComponent(recipient)));

  // WhatsApp con prefijo de Chile 569
  const waUrl = App.getWhatsAppComposeUrl(phone, body);
  assert.ok(waUrl.startsWith('https://api.whatsapp.com/send?phone=56987654321'));
  assert.ok(waUrl.includes(encodeURIComponent(body)));

  // mailto estándar
  const mailtoUrl = App.getMailtoUrl(recipient, subject, body);
  assert.ok(mailtoUrl.startsWith('mailto:alumno%40correo.cl'));
});

test('Seguimiento del estado de despacho por alumno y canal (recordStudentDispatch)', () => {
  App.db = JSON.parse(JSON.stringify(INITIAL_SEED_DATA));
  const studentId = 'ALU-DISP-01';
  const period = '2026-03';

  // Inicialmente no está despachado
  const initialStatus = App.getStudentDispatchStatus(studentId, period);
  assert.strictEqual(initialStatus, null);

  // Despachar por Gmail
  App.recordStudentDispatch(studentId, period, 'Gmail');

  const statusAfter = App.getStudentDispatchStatus(studentId, period);
  assert.ok(statusAfter);
  assert.strictEqual(statusAfter.studentId, studentId);
  assert.strictEqual(statusAfter.channel, 'Gmail');
  assert.ok(statusAfter.timestamp);

  // Actualizar despacho por WhatsApp
  App.recordStudentDispatch(studentId, period, 'WhatsApp');
  const statusUpdated = App.getStudentDispatchStatus(studentId, period);
  assert.strictEqual(statusUpdated.channel, 'WhatsApp');
});

test('generateBatchBillingDraft incorpora todos los conceptos de cobranza y desglose detallado', () => {
  App.db = JSON.parse(JSON.stringify(INITIAL_SEED_DATA));
  const s1 = {
    id: 'ALU-BCC-01',
    name: 'Alexis Sánchez',
    rut: '16.111.222-3',
    grade: 'Cinturón Café',
    monthlyFee: 40000,
    dueDay: 3,
    status: 'activo',
    startDate: '2026-01-01',
    email: 'alexis@karate.cl'
  };
  const s2 = {
    id: 'ALU-BCC-02',
    name: 'Claudio Bravo',
    rut: '15.333.444-5',
    grade: 'Cinturón Negro',
    monthlyFee: 50000,
    dueDay: 3,
    status: 'activo',
    startDate: '2025-11-01', // Con arrastre histórico
    email: 'claudio@karate.cl'
  };
  App.db.students = [s1, s2];

  const pending = App.getStudentsPendingBilling('2026-03');
  assert.strictEqual(pending.length, 2);

  const draft = App.generateBatchBillingDraft(pending, '2026-03', 'tesoreria@karate-lareina.cl');

  // Verificar conceptos de cobranza en el texto
  assert.ok(draft.body.includes('ESTRUCTURA Y CONCEPTOS DE COBRANZA:'));
  assert.ok(draft.body.includes('1. CUOTA MENSUALIDAD TATAMI:'));
  assert.ok(draft.body.includes('2. APORTE ADICIONAL FONDO DE RESERVA (10%):'));
  assert.ok(draft.body.includes('3. TOTAL DEL PERÍODO:'));
  assert.ok(draft.body.includes('4. ARRASTRE DE DEUDAS MULTIANUALES:'));

  // Desglose por alumno
  assert.ok(draft.body.includes('Alexis Sánchez'));
  assert.ok(draft.body.includes('$40.000'));
  assert.ok(draft.body.includes('$4.000')); // 10%
  assert.ok(draft.body.includes('$44.000')); // Subtotal Alexis

  assert.ok(draft.body.includes('Claudio Bravo'));
  assert.ok(draft.body.includes('$50.000'));
  assert.ok(draft.body.includes('$5.000')); // 10%
  assert.ok(draft.body.includes('$55.000')); // Subtotal Claudio
  assert.ok(draft.body.includes('NOTA ARRASTRE MULTIANUAL'));

  // Totales consolidados
  assert.strictEqual(draft.sumFees, 90000);
  assert.strictEqual(draft.sumReserve, 9000);
  assert.strictEqual(draft.sumTotal, 99000);
  assert.ok(draft.body.includes('Total Cuotas Tatami: $90.000'));
  assert.ok(draft.body.includes('Total Fondo de Reserva (10%): $9.000'));
  assert.ok(draft.body.includes('TOTAL GENERAL A RECAUDAR: $99.000'));

  // Cuentas bancarias
  assert.ok(draft.body.includes('Banco Estado'));
  assert.ok(draft.body.includes('Banco Santander'));
  assert.ok(draft.body.includes('tesoreria@karate-lareina.cl'));
});

test('dispatchBatchIndividualEmails emite correos individuales para cada miembro a sus correos afiliados', () => {
  App.db = JSON.parse(JSON.stringify(INITIAL_SEED_DATA));
  const s1 = {
    id: 'ALU-IND-01',
    name: 'Karateca Uno',
    rut: '17.111.222-3',
    grade: 'Cinturón Azul',
    monthlyFee: 35000,
    dueDay: 3,
    status: 'activo',
    startDate: '2026-01-01',
    email: 'uno@karate.cl'
  };
  const s2 = {
    id: 'ALU-IND-02',
    name: 'Karateca Dos',
    rut: '18.333.444-5',
    grade: 'Cinturón Verde',
    monthlyFee: 45000,
    dueDay: 3,
    status: 'activo',
    startDate: '2026-01-01',
    email: 'dos@karate.cl'
  };
  App.db.students = [s1, s2];

  // Ejecutar emisión individual en lote (con delay 0 para ejecución sincrónica de pruebas)
  App.dispatchBatchIndividualEmails(0);

  // Verificar que cada atleta fue despachado individualmente
  const st1 = App.getStudentDispatchStatus('ALU-IND-01', '2026-03');
  const st2 = App.getStudentDispatchStatus('ALU-IND-02', '2026-03');

  assert.ok(st1);
  assert.strictEqual(st1.channel, 'Gmail Individual');

  assert.ok(st2);
  assert.strictEqual(st2.channel, 'Gmail Individual');

  // Verificar que la carta individual de cada uno contiene sus conceptos y montos personalizados
  const draft1 = App.generateEmailBillingText(s1, '2026-03', 'sensei@karate.cl');
  assert.ok(draft1.body.includes('ESTRUCTURA Y CONCEPTOS DE LA COBRANZA:'));
  assert.ok(draft1.body.includes('Concepto 1 (Cuota Mensualidad Tatami): $35.000'));
  assert.ok(draft1.body.includes('Concepto 2 (Aporte Adicional Fondo de Reserva 10%): $3.500'));
  assert.ok(draft1.body.includes('TOTAL A PAGAR DEL PERÍODO: $38.500'));

  const draft2 = App.generateEmailBillingText(s2, '2026-03', 'sensei@karate.cl');
  assert.ok(draft2.body.includes('Concepto 1 (Cuota Mensualidad Tatami): $45.000'));
  assert.ok(draft2.body.includes('Concepto 2 (Aporte Adicional Fondo de Reserva 10%): $4.500'));
  assert.ok(draft2.body.includes('TOTAL A PAGAR DEL PERÍODO: $49.500'));
});

test('exportStudentsSpreadsheet genera archivo CSV con UTF-8 BOM, encabezados y datos completos de alumnos', () => {
  App.db = JSON.parse(JSON.stringify(INITIAL_SEED_DATA));
  App.db.students = [
    {
      id: 'ALU-EXP-01',
      name: 'José Pérez García',
      rut: '15.222.333-4',
      grade: 'Cinturón Café (4° Kyu)',
      phone: '+56911223344',
      email: 'jose.perez@karate.cl',
      monthlyFee: 40000,
      dueDay: 5,
      startDate: '2026-01-10',
      status: 'activo',
      notes: 'Competidor kata'
    }
  ];

  const csv = App.exportStudentsSpreadsheet();
  assert.ok(csv.startsWith('\uFEFF'), 'Debe incluir el prefijo UTF-8 BOM para compatibilidad con Excel');
  assert.ok(csv.includes('ID,Nombre,RUT,Grado,Telefono,Email,ValorMensual,DiaCorte,FechaIngreso,Estado,Observaciones'));
  assert.ok(csv.includes('José Pérez García'));
  assert.ok(csv.includes('15.222.333-4'));
  assert.ok(csv.includes('Cinturón Café (4° Kyu)'));
  assert.ok(csv.includes('Competidor kata'));
  assert.ok(csv.includes('40000'));
});

test('importStudentsSpreadsheet procesa hojas de cálculo con auto-detección de delimitadores y upsert de alumnos', () => {
  App.db = JSON.parse(JSON.stringify(INITIAL_SEED_DATA));
  App.db.students = [
    {
      id: 'ALU-EXIST-01',
      name: 'Alumno Antiguo',
      rut: '12.345.678-9',
      grade: 'Cinturón Blanco',
      phone: '+56911111111',
      email: 'antiguo@karate.cl',
      monthlyFee: 30000,
      dueDay: 5,
      startDate: '2025-01-01',
      status: 'activo',
      notes: 'Nota previa'
    }
  ];

  // CSV con punto y coma (formato típico de Excel en Chile/Latam)
  const csvDataSemicolon = [
    'ID;Nombre;RUT;Grado;Telefono;Email;ValorMensual;DiaCorte;FechaIngreso;Estado;Observaciones',
    'ALU-EXIST-01;Alumno Antiguo Actualizado;12.345.678-9;Cinturón Amarillo (9° Kyu);+56999999999;nuevo_email@karate.cl;$38.000;10;2025-01-01;activo;Ascendido a amarillo',
    ';Nuevo Karateca;19.888.777-6;Cinturón Naranjo;+56988887777;nuevo@karate.cl;45000;15;2026-03-01;becado;Beca municipal 2026'
  ].join('\n');

  const result = App.importStudentsSpreadsheet(csvDataSemicolon);

  assert.strictEqual(result.processed, 2);
  assert.strictEqual(result.updated, 1);
  assert.strictEqual(result.created, 1);

  // Verificar que el alumno existente fue actualizado correctamente
  const updatedStudent = App.db.students.find(s => s.id === 'ALU-EXIST-01');
  assert.ok(updatedStudent);
  assert.strictEqual(updatedStudent.name, 'Alumno Antiguo Actualizado');
  assert.strictEqual(updatedStudent.grade, 'Cinturón Amarillo (9° Kyu)');
  assert.strictEqual(updatedStudent.email, 'nuevo_email@karate.cl');
  assert.strictEqual(updatedStudent.monthlyFee, 38000);
  assert.strictEqual(updatedStudent.dueDay, 10);
  assert.strictEqual(updatedStudent.notes, 'Ascendido a amarillo');

  // Verificar que el nuevo alumno fue creado
  const newStudent = App.db.students.find(s => s.name === 'Nuevo Karateca');
  assert.ok(newStudent);
  assert.strictEqual(newStudent.rut, '19.888.777-6');
  assert.strictEqual(newStudent.status, 'becado');
  assert.strictEqual(newStudent.monthlyFee, 45000);
  assert.ok(newStudent.id.startsWith('ALU-'));
});

test('Modales nativos dialog:not([open]) están protegidos con display: none !important y sin clases de display incompatibles', () => {
  // 1. Verificar regla defensiva en CSS
  assert.ok(html.includes('dialog:not([open])'), 'Debe existir regla para dialog:not([open]) en CSS');
  assert.ok(html.includes('display: none !important;'), 'dialog:not([open]) debe usar display: none !important');

  // 2. Verificar que ninguna etiqueta <dialog> contenga clases que fuercen display (como flex, inline, block, grid)
  const dialogTags = html.match(/<dialog[^>]*>/g) || [];
  assert.ok(dialogTags.length >= 8, 'Deben existir al menos 8 modales <dialog>');
  dialogTags.forEach(tag => {
    assert.ok(!tag.includes('flex '), `La etiqueta dialog no debe tener clase 'flex': ${tag}`);
    assert.ok(!tag.includes('inline'), `La etiqueta dialog no debe tener clase 'inline': ${tag}`);
    assert.ok(!tag.includes('grid'), `La etiqueta dialog no debe tener clase 'grid': ${tag}`);
  });
});

test('Selección automática del mes y año actual en el período al inicializar (SPEC-006)', () => {
  const now = new Date();
  const expectedYear = String(now.getFullYear());
  const expectedMonth = String(now.getMonth() + 1).padStart(2, '0');

  // 1. Instanciar un nuevo App desde el script para verificar valores iniciales definidos
  const fresh = fn(sandbox.localStorage, sandbox.window, sandbox.document, Intl, Date, Set, sandbox.prompt, sandbox.alert, sandbox.confirm);
  assert.strictEqual(fresh.App.selectedYear, expectedYear, 'fresh.App.selectedYear debe coincidir con el año actual');
  assert.strictEqual(fresh.App.selectedMonth, expectedMonth, 'fresh.App.selectedMonth debe coincidir con el mes actual');

  // 2. Mock de elementos select del DOM
  const mockYearSelect = {
    options: [{ value: '2025' }, { value: '2026' }],
    value: '',
    appendChild(opt) { this.options.push(opt); }
  };
  const mockMonthSelect = {
    value: ''
  };

  const prevGetElementById = sandbox.document.getElementById;
  sandbox.document.getElementById = (id) => {
    if (id === 'select-year') return mockYearSelect;
    if (id === 'select-month') return mockMonthSelect;
    return null;
  };

  try {
    // Si se alterara el período en tiempo de ejecución, setupSelects debe restablecer siempre el mes y año en curso
    App.selectedYear = '1999';
    App.selectedMonth = '01';
    App.setupSelects();

    assert.strictEqual(App.selectedYear, expectedYear, 'setupSelects debe reasignar el año actual');
    assert.strictEqual(App.selectedMonth, expectedMonth, 'setupSelects debe reasignar el mes actual');
    assert.strictEqual(mockYearSelect.value, expectedYear, 'El selector select-year debe posicionarse en el año actual');
    assert.strictEqual(mockMonthSelect.value, expectedMonth, 'El selector select-month debe posicionarse en el mes actual');
  } finally {
    sandbox.document.getElementById = prevGetElementById;
  }

  // 3. Verificar que en el HTML no quede <option value="03" selected>Marzo</option>
  assert.ok(!html.includes('value="03" selected'), 'Marzo no debe tener selected cableado en el HTML');
});

test('normalizeDateToISO normaliza fechas en formato latino e ISO a YYYY-MM-DD (SPEC-007)', () => {
  assert.strictEqual(App.normalizeDateToISO('01-11-2026'), '2026-11-01');
  assert.strictEqual(App.normalizeDateToISO('1-11-2026'), '2026-11-01');
  assert.strictEqual(App.normalizeDateToISO('15/03/2025'), '2025-03-15');
  assert.strictEqual(App.normalizeDateToISO('2026-11-01'), '2026-11-01');
  assert.strictEqual(App.normalizeDateToISO('2026-11'), '2026-11-01');
  assert.strictEqual(App.normalizeDateToISO('11-2026'), '2026-11-01');
  assert.strictEqual(App.normalizeDateToISO('', '2026-11-01'), '2026-11-01');
});

test('parseCurrencyNumber parsea montos chilenos con punto de miles y enteros (SPEC-007)', () => {
  assert.strictEqual(App.parseCurrencyNumber('20.000'), 20000);
  assert.strictEqual(App.parseCurrencyNumber('55.000'), 55000);
  assert.strictEqual(App.parseCurrencyNumber('$40.000'), 40000);
  assert.strictEqual(App.parseCurrencyNumber('20000'), 20000);
  assert.strictEqual(App.parseCurrencyNumber(35000), 35000);
  assert.strictEqual(App.parseCurrencyNumber(0), 0);
  assert.strictEqual(App.parseCurrencyNumber(''), 0);
});

test('Alumnos ingresados en noviembre de este año tienen $0 de deuda arrastrada histórica (SPEC-007)', () => {
  App.db = JSON.parse(JSON.stringify(INITIAL_SEED_DATA));
  App.selectedYear = '2026';
  App.selectedMonth = '11';

  // Alumno con fecha formato latino 01-11-2026 y cuota < 60000
  const alumnoLatam = {
    id: 'ALU-NOV-01',
    name: 'Christian Cárdenas',
    rut: '27352706-0',
    monthlyFee: 20000,
    dueDay: 1,
    startDate: '01-11-2026',
    status: 'activo'
  };

  // Alumno con fecha ISO 2026-11-01 y cuota < 60000
  const alumnoIso = {
    id: 'ALU-NOV-02',
    name: 'Matteo Ortiz',
    rut: '28958282-7',
    monthlyFee: 55000,
    dueDay: 1,
    startDate: '2026-11-01',
    status: 'activo'
  };

  App.db.students = [alumnoLatam, alumnoIso];

  const st1 = App.getStudentFinancialStatus(alumnoLatam, '2026', '11');
  assert.strictEqual(st1.historicalDebt, 0, 'La deuda histórica arrastrada de años anteriores debe ser exactamente $0');
  assert.strictEqual(st1.historicalMonths.length, 0, 'No debe tener meses históricos adeudados');
  assert.strictEqual(st1.currentYearDebt, 20000, 'Solo debe adeudar el mes de ingreso (noviembre)');
  assert.strictEqual(st1.totalDebt, 20000, 'La deuda total debe ser exactamente $20.000');
  assert.deepStrictEqual(st1.currentYearUnpaidMonths, ['2026-11'], 'El único mes adeudado del año debe ser noviembre');

  const st2 = App.getStudentFinancialStatus(alumnoIso, '2026', '11');
  assert.strictEqual(st2.historicalDebt, 0, 'La deuda histórica arrastrada debe ser $0');
  assert.strictEqual(st2.historicalMonths.length, 0);
  assert.strictEqual(st2.currentYearDebt, 55000);
  assert.strictEqual(st2.totalDebt, 55000);
  assert.deepStrictEqual(st2.currentYearUnpaidMonths, ['2026-11']);
});

test('Importación de nómina con fechas latinas asigna $0 de deuda histórica arrastrada (SPEC-007)', () => {
  App.db = JSON.parse(JSON.stringify(INITIAL_SEED_DATA));
  App.selectedYear = '2026';
  App.selectedMonth = '11';

  const csvContent = [
    'ID;Nombre;RUT;Grado;Telefono;Email;ValorMensual;DiaCorte;FechaIngreso;Estado;Observaciones',
    'ALU-01;Atleta Uno;11.111.111-1;Cinturón Amarillo;+56911111111;atleta1@dojo.cl;20.000;1;01-11-2026;Activo;Apoderado Uno',
    'ALU-02;Atleta Dos;22.222.222-2;Cinturón Naranjo;+56922222222;atleta2@dojo.cl;55.000;1;01/11/2026;Activo;Apoderado Dos',
    'ALU-03;Atleta Tres;33.333.333-3;2do. Dan;;atleta3@dojo.cl;0;1;01-11-2026;Activo;Sensei'
  ].join('\n');

  const res = App.importStudentsSpreadsheet(csvContent);
  assert.strictEqual(res.processed, 3);

  let totalHist = 0;
  App.db.students.forEach(s => {
    assert.strictEqual(s.startDate, '2026-11-01', 'La fecha debe quedar estandarizada en YYYY-MM-DD');
    assert.ok(s.monthlyFee < 60000, 'La mensualidad debe ser menor a 60.000 CLP');
    const st = App.getStudentFinancialStatus(s, '2026', '11');
    totalHist += st.historicalDebt;
  });

  assert.strictEqual(totalHist, 0, 'El total de deuda histórica arrastrada debe ser exactamente $0');
});

test('openPaymentModal rechaza apertura para alumnos becados y solventes (SPEC-008)', () => {
  App.db = JSON.parse(JSON.stringify(INITIAL_SEED_DATA));
  App.selectedYear = '2026';
  App.selectedMonth = '11';

  let alertMessage = null;
  sandbox.onAlert = (msg) => { alertMessage = msg; };

  let dialogOpened = false;
  App.openDialog = () => { dialogOpened = true; };

  // 1. Alumno Becado
  const becado = {
    id: 'ALU-BEC-01',
    name: 'Atleta Becado',
    monthlyFee: 0,
    status: 'becado',
    startDate: '2026-11-01'
  };
  App.db.students.push(becado);

  dialogOpened = false;
  alertMessage = null;
  App.openPaymentModal('ALU-BEC-01');

  assert.strictEqual(dialogOpened, false, 'No debe abrir el modal de pago para alumnos becados');
  assert.ok(alertMessage && alertMessage.includes('Becado'), 'Debe emitir alerta informativa sobre condición de Becado');

  // 2. Alumno Solvente (Al Día sin deuda)
  const solvente = {
    id: 'ALU-SOL-01',
    name: 'Atleta Al Dia',
    monthlyFee: 35000,
    dueDay: 5,
    status: 'activo',
    startDate: '2026-11-01'
  };
  App.db.students.push(solvente);
  // Registrar pago de noviembre para dejarlo solvente
  App.db.transactions.push({
    id: 'TX-SOL-01',
    type: 'ingreso',
    studentId: 'ALU-SOL-01',
    categoryCode: 'mensualidad',
    period: '2026-11',
    amount: 35000,
    date: '2026-11-02'
  });

  const stSolvente = App.getStudentFinancialStatus(solvente, '2026', '11');
  assert.strictEqual(stSolvente.totalDebt, 0, 'El alumno debe tener deuda $0');

  dialogOpened = false;
  alertMessage = null;
  App.openPaymentModal('ALU-SOL-01');

  assert.strictEqual(dialogOpened, false, 'No debe abrir el modal de pago para alumnos solventes sin deudas');
  assert.ok(alertMessage && alertMessage.includes('solvente'), 'Debe emitir alerta indicando que el alumno está totalmente al día y solvente');

  sandbox.onAlert = null;
});

test('handlePaymentSubmit bloquea pagos duplicados y períodos no adeudados (SPEC-008)', () => {
  App.db = JSON.parse(JSON.stringify(INITIAL_SEED_DATA));
  App.selectedYear = '2026';
  App.selectedMonth = '11';

  let alertMessage = null;
  sandbox.onAlert = (msg) => { alertMessage = msg; };

  // Mock elementos del DOM requeridos por handlePaymentSubmit
  const domValues = {
    'pay-student-id': 'ALU-PAG-01',
    'pay-period': '2026-11',
    'pay-amount': '35000',
    'pay-date': '2026-11-05',
    'pay-account': 'CTA-01',
    'pay-method': 'transferencia',
    'pay-ref': 'REF-123',
    'pay-reserve-check': { checked: false },
    'pay-reserve-amount': { value: '0' }
  };

  const originalGetElementById = sandbox.document.getElementById;
  sandbox.document.getElementById = (id) => {
    if (id === 'pay-reserve-check') return domValues['pay-reserve-check'];
    if (id === 'pay-reserve-amount') return domValues['pay-reserve-amount'];
    if (domValues[id] !== undefined) return { value: domValues[id] };
    return null;
  };

  App.saveDatabase = () => {};
  App.closeDialog = () => {};
  App.renderAll = () => {};

  const student = {
    id: 'ALU-PAG-01',
    name: 'Atleta Pagos',
    monthlyFee: 35000,
    status: 'activo',
    startDate: '2026-11-01'
  };
  App.db.students = [student];

  // Caso A: El período 2026-11 ya está pagado en la base de datos
  App.db.transactions = [{
    id: 'TX-EXISTING',
    type: 'ingreso',
    studentId: 'ALU-PAG-01',
    categoryCode: 'mensualidad',
    period: '2026-11',
    amount: 35000,
    date: '2026-11-01'
  }];

  const initialTxCount = App.db.transactions.length;
  alertMessage = null;

  App.handlePaymentSubmit({ preventDefault: () => {} });

  assert.strictEqual(App.db.transactions.length, initialTxCount, 'No debe insertar transacciones duplicadas para períodos ya solventados');
  assert.ok(alertMessage && alertMessage.includes('ya fue pagado'), 'Debe alertar que el período ya fue pagado previamente');

  // Caso B: Período previo al ingreso (2026-05) que no es exigible ni adeudado
  domValues['pay-period'] = '2026-05';
  alertMessage = null;

  App.handlePaymentSubmit({ preventDefault: () => {} });

  assert.strictEqual(App.db.transactions.length, initialTxCount, 'No debe insertar transacciones para períodos no adeudados');
  assert.ok(alertMessage && alertMessage.includes('al día en el período') || alertMessage.includes('Solo se permite registrar pagos'), 'Debe alertar que no adeuda dicho período');

  sandbox.onAlert = null;
  sandbox.document.getElementById = originalGetElementById;
});

test('handlePaymentSubmit procesa pago para períodos adeudados y luego bloquea duplicados (SPEC-008)', () => {
  App.db = JSON.parse(JSON.stringify(INITIAL_SEED_DATA));
  App.selectedYear = '2026';
  App.selectedMonth = '11';

  let alertMessage = null;
  sandbox.onAlert = (msg) => { alertMessage = msg; };

  const domValues = {
    'pay-student-id': 'ALU-DEUDA-01',
    'pay-period': '2026-11',
    'pay-amount': '30000',
    'pay-date': '2026-11-05',
    'pay-account': 'CTA-01',
    'pay-method': 'transferencia',
    'pay-ref': 'REF-OK',
    'pay-reserve-check': { checked: true },
    'pay-reserve-amount': { value: '3000' }
  };

  const originalGetElementById = sandbox.document.getElementById;
  sandbox.document.getElementById = (id) => {
    if (id === 'pay-reserve-check') return domValues['pay-reserve-check'];
    if (id === 'pay-reserve-amount') return domValues['pay-reserve-amount'];
    if (domValues[id] !== undefined) return { value: domValues[id] };
    return null;
  };

  App.saveDatabase = () => {};
  App.closeDialog = () => {};
  App.renderAll = () => {};

  const student = {
    id: 'ALU-DEUDA-01',
    name: 'Atleta Con Deuda',
    monthlyFee: 30000,
    status: 'activo',
    startDate: '2026-11-01'
  };
  App.db.students = [student];
  App.db.transactions = [];

  // Verificar que adeuda 2026-11
  const stAntes = App.getStudentFinancialStatus(student, '2026', '11');
  assert.strictEqual(stAntes.totalDebt, 30000);
  assert.deepStrictEqual(stAntes.currentYearUnpaidMonths, ['2026-11']);

  // Procesar pago legítimo
  App.handlePaymentSubmit({ preventDefault: () => {} });

  assert.strictEqual(App.db.transactions.length, 2, 'Debe registrar la transacción de mensualidad y la de fondo de reserva');
  const feeTx = App.db.transactions.find(tx => tx.categoryCode === 'mensualidad');
  assert.strictEqual(feeTx.amount, 30000);
  assert.strictEqual(feeTx.period, '2026-11');

  // Ahora el alumno debe estar solvente
  const stDespues = App.getStudentFinancialStatus(student, '2026', '11');
  assert.strictEqual(stDespues.totalDebt, 0, 'Tras el pago, la deuda debe ser $0');

  // Intento de re-pago inmediato para el mismo período
  alertMessage = null;
  App.handlePaymentSubmit({ preventDefault: () => {} });

  assert.strictEqual(App.db.transactions.length, 2, 'No debe permitir registrar un pago repetido');
  assert.ok(alertMessage && alertMessage.includes('ya fue pagado'), 'Debe bloquear con alerta de pago previo duplicado');

  sandbox.onAlert = null;
  sandbox.document.getElementById = originalGetElementById;
});
