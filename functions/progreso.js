// Reglas del programa, sin acceso a base de datos: reciben el progreso actual y
// devuelven el nuevo. index.js las aplica dentro de transacciones de Firestore.

export const NIVEL_MAXIMO = 3;
// Puntuación mínima (0-100) para aprobar una evaluación de nivel.
export const PUNTUACION_MINIMA = 70;
const MAX_SESIONES_GUARDADAS = 50;
const MAX_EVALUACIONES_GUARDADAS = 100;

export const COACHES = ['femenino', 'masculino'];

export function progresoInicial() {
  return { nivel: 1, programaCompleto: false, evaluaciones: [], sesiones: [], coach: 'femenino' };
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

/** Cambia el perfil del coach (femenino o masculino). */
export function aplicarCoach(actual, coach) {
  const progreso = structuredClone(normalizar(actual));
  if (!COACHES.includes(coach)) return { progreso, cambio: false, mensaje: `Coach desconocido: ${coach}` };
  progreso.coach = coach;
  return { progreso, cambio: true, mensaje: 'Coach actualizado.' };
}

/** Vuelve al Nivel 1 conservando la elección de coach. */
export function aplicarReinicio(actual) {
  return { progreso: { ...progresoInicial(), coach: normalizar(actual).coach }, cambio: true, mensaje: 'Programa reiniciado.' };
}

/** Limpia la situación que escribe el usuario para la práctica libre. */
export function limpiarSituacion(texto) {
  return String(texto ?? '').replace(/\s+/g, ' ').trim().slice(0, 500);
}

/**
 * Guarda el resumen de una sesión. `tipo` distingue las del programa de las
 * de práctica libre (que además guardan la situación practicada).
 */
export function aplicarResumen(actual, resumen, { tipo = 'programa', situacion = '' } = {}) {
  const progreso = structuredClone(normalizar(actual));
  const texto = String(resumen ?? '').trim().slice(0, 3000);
  if (!texto) return { progreso, cambio: false, mensaje: 'Resumen vacío: no se guardó nada.' };
  const sesion = { fecha: new Date().toISOString(), nivel: progreso.nivel, resumen: texto };
  if (tipo === 'practica') Object.assign(sesion, { tipo, situacion: limpiarSituacion(situacion).slice(0, 200) });
  progreso.sesiones.push(sesion);
  progreso.sesiones = progreso.sesiones.slice(-MAX_SESIONES_GUARDADAS);
  return { progreso, cambio: true, mensaje: 'Resumen guardado.' };
}
