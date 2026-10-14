import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';

process.env.PROGRESO_ARCHIVO = path.join(await mkdtemp(path.join(tmpdir(), 'coach-')), 'progreso.json');
const { cargarProgreso, guardarResumenSesion, registrarEvaluacion, reiniciarProgreso } = await import(
  '../server/progreso.js'
);

beforeEach(() => reiniciarProgreso());

test('empieza en el nivel 1', async () => {
  assert.equal((await cargarProgreso()).nivel, 1);
});

test('sube de nivel solo con aprobado y puntuación suficiente', async () => {
  await registrarEvaluacion({ nivel: 1, aprobado: true, puntuacion: 60, feedback: 'casi' });
  assert.equal((await cargarProgreso()).nivel, 1);
  await registrarEvaluacion({ nivel: 1, aprobado: false, puntuacion: 90, feedback: 'no' });
  assert.equal((await cargarProgreso()).nivel, 1);
  await registrarEvaluacion({ nivel: 1, aprobado: true, puntuacion: 85, feedback: 'bien' });
  assert.equal((await cargarProgreso()).nivel, 2);
});

test('ignora evaluaciones de otro nivel', async () => {
  const { mensaje } = await registrarEvaluacion({ nivel: 3, aprobado: true, puntuacion: 100, feedback: 'x' });
  assert.match(mensaje, /No se registró/);
  assert.equal((await cargarProgreso()).nivel, 1);
});

test('completa el programa tras el nivel 3', async () => {
  for (const nivel of [1, 2, 3]) {
    await registrarEvaluacion({ nivel, aprobado: true, puntuacion: 80, feedback: 'ok' });
  }
  const p = await cargarProgreso();
  assert.equal(p.nivel, 3);
  assert.equal(p.programaCompleto, true);
});

test('escrituras simultáneas no se pisan', async () => {
  await Promise.all([
    registrarEvaluacion({ nivel: 1, aprobado: true, puntuacion: 80, feedback: 'a' }),
    guardarResumenSesion('resumen 1'),
    guardarResumenSesion('resumen 2'),
  ]);
  const p = await cargarProgreso();
  assert.equal(p.nivel, 2);
  assert.equal(p.sesiones.length, 2);
});
