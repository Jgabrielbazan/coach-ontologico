import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aplicarEvaluacion, aplicarResumen, progresoInicial } from './progreso.js';

const evaluar = (progreso, nivel, aprobado, puntuacion) =>
  aplicarEvaluacion(progreso, { nivel, aprobado, puntuacion, feedback: 'x' });

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
  p = aplicarEvaluacion(p, { nivel: 1, aprobado: true, puntuacion: 90 }).progreso;
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
  assert.deepEqual(nombres, ['asignar_tarea', 'guardar_resumen_sesion']);
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
