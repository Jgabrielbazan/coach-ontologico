// Reglas del programa, sin acceso a base de datos: reciben el progreso actual y
// devuelven el nuevo. index.js las aplica dentro de transacciones de Firestore.

export const NIVEL_MAXIMO = 3;
// Puntuación mínima (0-100) para aprobar una evaluación de nivel.
export const PUNTUACION_MINIMA = 70;
const MAX_SESIONES_GUARDADAS = 50;
const MAX_EVALUACIONES_GUARDADAS = 100;

export function progresoInicial() {
  return { nivel: 1, programaCompleto: false, evaluaciones: [], sesiones: [] };
}

export function normalizar(datos) {
  return { ...progresoInicial(), ...(datos ?? {}) };
}

/**
 * Aplica el resultado de una evaluación oral. Es el servidor, no el modelo,
 * quien decide si el usuario sube de nivel: hace falta aprobado + puntuación
 * mínima + que la evaluación sea del nivel actual.
 * Devuelve { progreso, mensaje, cambio }.
 */
export function aplicarEvaluacion(actual, { nivel, aprobado, puntuacion, feedback } = {}) {
  const progreso = structuredClone(normalizar(actual));
  const puntos = Math.max(0, Math.min(100, Math.round(Number(puntuacion) || 0)));
  const nivelEvaluado = Number(nivel) || progreso.nivel;

  if (progreso.programaCompleto) {
    return { progreso, cambio: false, mensaje: 'El programa ya está completo. No hay más niveles que evaluar.' };
  }
  if (nivelEvaluado !== progreso.nivel) {
    return {
      progreso,
      cambio: false,
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
  progreso.evaluaciones = progreso.evaluaciones.slice(-MAX_EVALUACIONES_GUARDADAS);

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
  return { progreso, cambio: true, mensaje };
}

export function aplicarResumen(actual, resumen) {
  const progreso = structuredClone(normalizar(actual));
  const texto = String(resumen ?? '').trim().slice(0, 3000);
  if (!texto) return { progreso, cambio: false, mensaje: 'Resumen vacío: no se guardó nada.' };
  progreso.sesiones.push({ fecha: new Date().toISOString(), nivel: progreso.nivel, resumen: texto });
  progreso.sesiones = progreso.sesiones.slice(-MAX_SESIONES_GUARDADAS);
  return { progreso, cambio: true, mensaje: 'Resumen guardado.' };
}
