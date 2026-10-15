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
