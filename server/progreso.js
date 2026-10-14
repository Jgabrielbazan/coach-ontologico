import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

export const NIVEL_MAXIMO = 3;
// Puntuación mínima (0-100) para aprobar una evaluación de nivel.
export const PUNTUACION_MINIMA = 70;
const MAX_SESIONES_GUARDADAS = 50;

const ARCHIVO =
  process.env.PROGRESO_ARCHIVO ?? path.join(process.cwd(), 'data', 'progreso.json');

export function progresoInicial() {
  return { nivel: 1, programaCompleto: false, evaluaciones: [], sesiones: [] };
}

export async function cargarProgreso() {
  try {
    const datos = JSON.parse(await readFile(ARCHIVO, 'utf8'));
    return { ...progresoInicial(), ...datos };
  } catch (err) {
    if (err.code === 'ENOENT') return progresoInicial();
    throw err;
  }
}

async function guardarProgreso(progreso) {
  await mkdir(path.dirname(ARCHIVO), { recursive: true });
  // Escritura atómica: si el proceso se corta a mitad, el archivo anterior queda intacto.
  const temporal = `${ARCHIVO}.tmp`;
  await writeFile(temporal, JSON.stringify(progreso, null, 2), 'utf8');
  await rename(temporal, ARCHIVO);
}

// Serializa las escrituras para que dos llamadas simultáneas no se pisen.
let cola = Promise.resolve();
function enCola(tarea) {
  const resultado = cola.then(tarea);
  cola = resultado.catch(() => {});
  return resultado;
}

/**
 * Registra el resultado de una evaluación oral. El servidor, no el modelo,
 * decide si el usuario sube de nivel: hace falta aprobado + puntuación mínima
 * + que la evaluación sea del nivel actual.
 */
export function registrarEvaluacion({ nivel, aprobado, puntuacion, feedback }) {
  return enCola(async () => {
    const progreso = await cargarProgreso();
    const puntos = Math.max(0, Math.min(100, Math.round(Number(puntuacion) || 0)));
    const nivelEvaluado = Number(nivel) || progreso.nivel;

    if (progreso.programaCompleto) {
      return { progreso, mensaje: 'El programa ya está completo. No hay más niveles que evaluar.' };
    }
    if (nivelEvaluado !== progreso.nivel) {
      return {
        progreso,
        mensaje: `No se registró: el usuario está en el NIVEL ${progreso.nivel}, no en el ${nivelEvaluado}. Evalúa solo el nivel actual.`,
      };
    }

    const supera = Boolean(aprobado) && puntos >= PUNTUACION_MINIMA;
    progreso.evaluaciones.push({
      nivel: progreso.nivel,
      aprobado: supera,
      puntuacion: puntos,
      feedback: String(feedback ?? '').slice(0, 2000),
      fecha: new Date().toISOString(),
    });

    let mensaje;
    if (!supera) {
      mensaje =
        `No aprobado (puntuación ${puntos}, mínimo ${PUNTUACION_MINIMA}). ` +
        `Sigue en el NIVEL ${progreso.nivel}. Da feedback concreto y propón practicar de nuevo.`;
    } else if (progreso.nivel < NIVEL_MAXIMO) {
      progreso.nivel += 1;
      mensaje = `Aprobado con ${puntos}. El usuario sube al NIVEL ${progreso.nivel}. Felicítalo y presenta brevemente el nuevo nivel.`;
    } else {
      progreso.programaCompleto = true;
      mensaje = `Aprobado con ${puntos}. ¡Programa completo! Celebra el logro y haz un cierre del recorrido.`;
    }

    await guardarProgreso(progreso);
    return { progreso, mensaje };
  });
}

export function guardarResumenSesion(resumen) {
  return enCola(async () => {
    const progreso = await cargarProgreso();
    const texto = String(resumen ?? '').trim().slice(0, 3000);
    if (texto) {
      progreso.sesiones.push({ fecha: new Date().toISOString(), nivel: progreso.nivel, resumen: texto });
      progreso.sesiones = progreso.sesiones.slice(-MAX_SESIONES_GUARDADAS);
      await guardarProgreso(progreso);
    }
    return { progreso, mensaje: texto ? 'Resumen guardado.' : 'Resumen vacío: no se guardó nada.' };
  });
}

export function reiniciarProgreso() {
  return enCola(async () => {
    const progreso = progresoInicial();
    await guardarProgreso(progreso);
    return progreso;
  });
}
