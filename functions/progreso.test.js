import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CRITERIOS, aplicarEvaluacion, aplicarResumen, progresoInicial } from './progreso.js';

// "aprobado" = el coach marca todos los criterios del nivel como cumplidos.
const evaluar = (progreso, nivel, aprobado, puntuacion) =>
  aplicarEvaluacion(progreso, {
    nivel,
    criterios: (CRITERIOS[nivel] ?? []).map((c) => ({ id: c.id, cumplido: aprobado, evidencia: 'ej.' })),
    puntuacion,
    feedback: 'x',
  });

test('sube de nivel solo con aprobado y puntuación suficiente', () => {
  let p = progresoInicial();
  p = evaluar(p, 1, true, 60).progreso;
  assert.equal(p.nivel, 1);
  p = evaluar(p, 1, false, 90).progreso;
  assert.equal(p.nivel, 1);
  p = evaluar(p, 1, true, 85).progreso;
  assert.equal(p.nivel, 2);
  assert.equal(p.evaluaciones.length, 3);
});

test('ignora evaluaciones de otro nivel sin modificar nada', () => {
  const r = evaluar(progresoInicial(), 3, true, 100);
  assert.equal(r.cambio, false);
  assert.match(r.mensaje, /No se registró/);
  assert.equal(r.progreso.evaluaciones.length, 0);
});

test('completa el programa tras aprobar el nivel 3', () => {
  let p = progresoInicial();
  for (const nivel of [1, 2, 3]) p = evaluar(p, nivel, true, 80).progreso;
  assert.equal(p.nivel, 3);
  assert.equal(p.programaCompleto, true);
  assert.equal(evaluar(p, 3, true, 90).cambio, false);
});

test('no modifica el objeto recibido', () => {
  const original = progresoInicial();
  evaluar(original, 1, true, 90);
  aplicarResumen(original, 'hola');
  assert.deepEqual(original, progresoInicial());
});

test('acota la puntuación y descarta resúmenes vacíos', () => {
  assert.equal(evaluar(progresoInicial(), 1, true, 500).progreso.evaluaciones[0].puntuacion, 100);
  assert.equal(aplicarResumen(progresoInicial(), '   ').cambio, false);
  assert.equal(aplicarResumen(progresoInicial(), 'Trabajamos juicios').progreso.sesiones.length, 1);
});

test('completa campos faltantes de documentos viejos', () => {
  const r = aplicarResumen({ nivel: 2 }, 'algo');
  assert.equal(r.progreso.nivel, 2);
  assert.deepEqual(r.progreso.evaluaciones, []);
});

test('elige coach y lo conserva al reiniciar', async () => {
  const { aplicarCoach, aplicarReinicio } = await import('./progreso.js');
  let p = progresoInicial();
  assert.equal(p.coach, 'femenino');
  p = aplicarCoach(p, 'masculino').progreso;
  assert.equal(p.coach, 'masculino');
  assert.equal(aplicarCoach(p, 'robot').cambio, false);
  p = evaluar(p, 1, true, 90).progreso;
  const reiniciado = aplicarReinicio(p).progreso;
  assert.equal(reiniciado.nivel, 1);
  assert.equal(reiniciado.coach, 'masculino');
});

test('las instrucciones usan la identidad del coach elegido', async () => {
  const { instruccionesSistema, configuracionLive } = await import('./coach.js');
  const masc = { ...progresoInicial(), coach: 'masculino' };
  assert.match(instruccionesSistema(masc), /Te llamas Tomás/);
  assert.equal(configuracionLive(masc).speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName, 'Charon');
  assert.match(instruccionesSistema(progresoInicial()), /Te llamas Sofía/);
});

test('práctica libre: resumen marcado con la situación', () => {
  const r = aplicarResumen(progresoInicial(), 'Practicamos pedir un aumento.', {
    tipo: 'practica',
    situacion: '  Pedirle   un aumento a mi jefe  ',
  });
  const sesion = r.progreso.sesiones[0];
  assert.equal(sesion.tipo, 'practica');
  assert.equal(sesion.situacion, 'Pedirle un aumento a mi jefe');
  assert.equal(aplicarResumen(progresoInicial(), 'normal').progreso.sesiones[0].tipo, undefined);
});

test('práctica libre: instrucciones y herramientas propias', async () => {
  const { configuracionLive } = await import('./coach.js');
  const practica = configuracionLive(progresoInicial(), { modo: 'practica', situacion: 'Poner un límite a mi hermano' });
  assert.match(practica.systemInstruction, /práctica libre/);
  assert.match(practica.systemInstruction, /«Poner un límite a mi hermano»/);
  const nombres = practica.tools[0].functionDeclarations.map((f) => f.name);
  assert.deepEqual(nombres, ['asignar_tarea', 'dejar_frase', 'registrar_avance', 'guardar_resumen_sesion']);
  const programa = configuracionLive(progresoInicial());
  assert.ok(programa.tools[0].functionDeclarations.some((f) => f.name === 'registrar_evaluacion'));
});

test('el coach incluye oficio y conocimiento ampliado en ambos modos', async () => {
  const { instruccionesSistema, instruccionesPractica } = await import('./coach.js');
  for (const texto of [instruccionesSistema(progresoInicial()), instruccionesPractica(progresoInicial(), 'Pedir un aumento')]) {
    assert.match(texto, /Tu oficio/);
    assert.match(texto, /Juicios fundados: las 5 condiciones/);
    assert.match(texto, /no finjas ser humano/);
  }
});

test('tareas entre sesiones: asignar, reflexionar y retomar', async () => {
  const { aplicarTarea, aplicarReflexion } = await import('./progreso.js');
  const { instruccionesSistema } = await import('./coach.js');
  let p = aplicarTarea(progresoInicial(), 'Anota tres juicios por día y sus hechos.').progreso;
  assert.equal(p.tareas.length, 1);
  assert.match(instruccionesSistema(p), /pregúntale brevemente cómo le fue/);
  const id = p.tareas[0].id;
  assert.equal(aplicarReflexion(p, 'otro', 'x').cambio, false);
  p = aplicarReflexion(p, id, 'Me costó separar el hecho del juicio con mi jefe.').progreso;
  assert.equal(p.tareas[0].reflexion, 'Me costó separar el hecho del juicio con mi jefe.');
  assert.match(instruccionesSistema(p), /«Me costó separar/);
  assert.equal(aplicarTarea(p, '   ').cambio, false);
});

test('uso del mes: suma, se reinicia al cambiar de mes y acota valores', async () => {
  const { aplicarUso, minutosDelMes } = await import('./progreso.js');
  const octubre = new Date('2026-10-15T12:00:00Z');
  let p = aplicarUso(progresoInicial(), 600, octubre).progreso;
  p = aplicarUso(p, 300, octubre).progreso;
  assert.equal(minutosDelMes(p, octubre), 15);
  assert.equal(p.uso.sesiones, 2);
  assert.equal(minutosDelMes(p, new Date('2026-11-02T12:00:00Z')), 0);
  p = aplicarUso(p, 120, new Date('2026-11-02T12:00:00Z')).progreso;
  assert.deepEqual(p.uso, { mes: '2026-11', segundos: 120, sesiones: 1 });
  assert.equal(aplicarUso(p, -50).cambio, false);
  assert.equal(aplicarUso(progresoInicial(), 1e9, octubre).progreso.uso.segundos, 4 * 3600);
});

test('evaluación: un criterio sin cumplir impide aprobar aunque el puntaje alcance', () => {
  const r = aplicarEvaluacion(progresoInicial(), {
    nivel: 1,
    criterios: [{ id: 'clasifica', cumplido: true, evidencia: '4 de 5 bien' }],
    puntuacion: 95,
    feedback: 'Bien, pero no justificó',
  });
  assert.equal(r.progreso.nivel, 1);
  assert.match(r.mensaje, /faltan criterios: Justifica/);
  const guardada = r.progreso.evaluaciones[0];
  assert.equal(guardada.criterios.length, 2);
  assert.equal(guardada.criterios[1].cumplido, false);
  assert.equal(guardada.criterios[0].evidencia, '4 de 5 bien');
});

test('mantener para hablar desactiva la detección automática', async () => {
  const { configuracionLive } = await import('./coach.js');
  const manual = configuracionLive(progresoInicial(), { manual: true });
  assert.deepEqual(manual.realtimeInputConfig.automaticActivityDetection, { disabled: true });
  const auto = configuracionLive(progresoInicial());
  assert.equal(auto.realtimeInputConfig.automaticActivityDetection.disabled, undefined);
});

test('recordatorios: horario local, una vez por día y mensaje según la tarea', async () => {
  const { aplicarRecordatorio, debeEnviar, horaLocal, mensajeRecordatorio } = await import('./recordatorios.js');
  const { aplicarTarea } = await import('./progreso.js');
  // 23:30 UTC = 20:30 en Buenos Aires (UTC-3).
  const ahora = new Date('2026-10-15T23:30:00Z');
  assert.deepEqual(horaLocal('America/Argentina/Buenos_Aires', ahora), { fecha: '2026-10-15', hora: 20 });
  const rec = aplicarRecordatorio(progresoInicial(), { activo: true, hora: 20, zona: 'America/Argentina/Buenos_Aires' })
    .progreso.recordatorio;
  assert.equal(debeEnviar(rec, ahora).enviar, true);
  assert.equal(debeEnviar({ ...rec, ultimoEnvio: '2026-10-15' }, ahora).enviar, false);
  assert.equal(debeEnviar({ ...rec, hora: 8 }, ahora).enviar, false);
  assert.equal(debeEnviar({ ...rec, activo: false }, ahora).enviar, false);
  assert.equal(aplicarRecordatorio(progresoInicial(), { activo: true, hora: 99, zona: 'Marte/Base' }).progreso.recordatorio.zona, 'UTC');

  assert.match(mensajeRecordatorio(progresoInicial()).cuerpo, /Nivel 1/);
  const conTarea = aplicarTarea(progresoInicial(), 'Anota tres juicios por día.').progreso;
  assert.match(mensajeRecordatorio(conTarea).titulo, /Sofía: ¿cómo vas con tu tarea\?/);
});

test('diálogo afectivo activado y pautas de humor e ironía', async () => {
  const { configuracionLive, instruccionesSistema } = await import('./coach.js');
  assert.equal(configuracionLive(progresoInicial()).enableAffectiveDialog, true);
  assert.match(instruccionesSistema(progresoInicial()), /noto algo de ironía/);
});

test('tu evolución: guarda citas textuales, sin duplicados, y conserva el primer punto de partida', async () => {
  const { aplicarAvance } = await import('./progreso.js');
  let p = aplicarAvance(progresoInicial(), { cita: '"Mi jefe nunca escucha."', tipo: 'partida', distincion: 'juicio como hecho' }).progreso;
  assert.deepEqual(
    { ...p.evolucion[0], fecha: undefined },
    { tipo: 'partida', cita: 'Mi jefe nunca escucha.', distincion: 'juicio como hecho', nivel: 1, fecha: undefined },
  );
  assert.equal(aplicarAvance(p, { cita: 'Mi jefe nunca escucha.' }).cambio, false);
  assert.equal(aplicarAvance(p, { cita: '  ' }).cambio, false);
  assert.equal(aplicarAvance(p, { cita: 'otra', tipo: 'raro' }).progreso.evolucion[1].tipo, 'avance');
  for (let i = 0; i < 70; i++) p = aplicarAvance(p, { cita: `Avance ${i}`, tipo: 'avance' }).progreso;
  assert.equal(p.evolucion.length, 60);
  assert.equal(p.evolucion[0].cita, 'Mi jefe nunca escucha.');
  assert.equal(p.evolucion.at(-1).cita, 'Avance 69');
});

test('reconocimiento: el coach recibe el antes y el ahora y la pauta para nombrarlo', async () => {
  const { aplicarAvance } = await import('./progreso.js');
  const { instruccionesSistema, instruccionesPractica } = await import('./coach.js');
  let p = aplicarAvance(progresoInicial(), { cita: 'Mi jefe nunca escucha.', tipo: 'partida' }).progreso;
  p = aplicarAvance(p, { cita: 'No respondió dos correos; voy a pedirle 15 minutos.', tipo: 'avance', distincion: 'pedido con plazo' }).progreso;
  const texto = instruccionesSistema(p);
  assert.match(texto, /punto de partida: «Mi jefe nunca escucha\.»/);
  assert.match(texto, /avance: «No respondió dos correos; voy a pedirle 15 minutos\.» \(pedido con plazo\)/);
  assert.match(texto, /nombra UN progreso concreto/);
  assert.match(instruccionesPractica(p, 'Pedir un aumento'), /registrar_avance/);
});

test('ceremonia: al aprobar, el coach recibe las citas del nivel y la pauta del cierre', async () => {
  const { aplicarAvance } = await import('./progreso.js');
  let p = aplicarAvance(progresoInicial(), { cita: 'Separé el hecho del juicio.', tipo: 'avance' }).progreso;
  const aprobado = evaluar(p, 1, true, 88);
  assert.equal(aprobado.progreso.nivel, 2);
  assert.match(aprobado.mensaje, /aprobó el NIVEL 1 y sube al NIVEL 2/);
  assert.match(aprobado.mensaje, /CEREMONIA/);
  assert.match(aprobado.mensaje, /«Separé el hecho del juicio\.»/);
  assert.doesNotMatch(evaluar(p, 1, false, 88).mensaje, /CEREMONIA/);
  // Las citas del nivel 1 no se mezclan en la ceremonia del nivel 2.
  p = evaluar(aprobado.progreso, 2, true, 90);
  assert.doesNotMatch(p.mensaje, /Separé/);
});

test('"algo para llevarte": se guarda, se retoma y llega en el recordatorio', async () => {
  const { aplicarFrase, aplicarTarea, aplicarReflexion } = await import('./progreso.js');
  const { instruccionesSistema } = await import('./coach.js');
  const { mensajeRecordatorio } = await import('./recordatorios.js');
  let p = aplicarFrase(progresoInicial(), '  Mantén la postura erguida:   tu cuerpo también habla. ').progreso;
  assert.equal(p.frases[0].texto, 'Mantén la postura erguida: tu cuerpo también habla.');
  assert.match(instruccionesSistema(p), /«Mantén la postura erguida/);
  assert.deepEqual(mensajeRecordatorio(p), { titulo: 'Para llevarte, de Sofía', cuerpo: 'Mantén la postura erguida: tu cuerpo también habla.' });
  // Una tarea pendiente tiene prioridad en el recordatorio; ya reflexionada, vuelve la frase.
  p = aplicarTarea(p, 'Anota tres juicios.').progreso;
  assert.match(mensajeRecordatorio(p).titulo, /tarea/);
  p = aplicarReflexion(p, p.tareas[0].id, 'Hecho.').progreso;
  assert.match(mensajeRecordatorio(p).titulo, /Para llevarte/);
  assert.equal(aplicarFrase(p, '   ').cambio, false);
});
