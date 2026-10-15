// Reglas del programa, sin acceso a base de datos: reciben el progreso actual y
// devuelven el nuevo. index.js las aplica dentro de transacciones de Firestore.

export const NIVEL_MAXIMO = 3;
// Puntuación mínima (0-100) para aprobar una evaluación de nivel.
export const PUNTUACION_MINIMA = 70;
const MAX_SESIONES_GUARDADAS = 50;
const MAX_EVALUACIONES_GUARDADAS = 100;
const MAX_TAREAS_GUARDADAS = 30;

export const COACHES = ['femenino', 'masculino'];

// Criterios explícitos de cada evaluación. Se aprueba solo si se cumplen todos
// y la puntuación llega al mínimo: lo decide el servidor, no el modelo.
export const CRITERIOS = {
  1: [
    { id: 'clasifica', texto: 'Clasifica bien al menos 4 de los 5 elementos como hecho o juicio' },
    { id: 'justifica', texto: 'Justifica al menos una clasificación con su propio razonamiento' },
  ],
  2: [
    { id: 'declaracion', texto: 'Elige una declaración pertinente para el caso' },
    { id: 'formula', texto: 'La formula en primera persona, con claridad, como si estuviera en la situación' },
    { id: 'impacto', texto: 'Explica qué posibilidad abre o cierra esa declaración' },
  ],
  3: [
    { id: 'coherencia', texto: 'Sostiene el rol con coherencia entre lo que dice, cómo lo dice y su cuerpo' },
    { id: 'corrige', texto: 'Corrige al menos una incoherencia cuando se le señala' },
    { id: 'voz', texto: 'Usa pausas y un ritmo de voz que transmiten calma y seguridad' },
  ],
};

export function progresoInicial() {
  return { nivel: 1, programaCompleto: false, evaluaciones: [], sesiones: [], tareas: [], coach: 'femenino' };
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
export function aplicarEvaluacion(actual, { nivel, criterios = [], puntuacion, feedback } = {}) {
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

  // Cada criterio del nivel, con lo que reportó el coach (lo no reportado cuenta como no cumplido).
  const reportados = new Map((Array.isArray(criterios) ? criterios : []).map((c) => [c?.id, c]));
  const detalle = CRITERIOS[progreso.nivel].map(({ id, texto }) => ({
    id,
    texto,
    cumplido: reportados.get(id)?.cumplido === true,
    evidencia: String(reportados.get(id)?.evidencia ?? '').slice(0, 400),
  }));
  const faltantes = detalle.filter((c) => !c.cumplido);
  const supera = faltantes.length === 0 && puntos >= PUNTUACION_MINIMA;
  progreso.evaluaciones.push({
    nivel: progreso.nivel,
    aprobado: supera,
    criterios: detalle,
    puntuacion: puntos,
    feedback: String(feedback ?? '').slice(0, 2000),
    fecha: new Date().toISOString(),
  });
  progreso.evaluaciones = progreso.evaluaciones.slice(-MAX_EVALUACIONES_GUARDADAS);

  let mensaje;
  if (!supera) {
    const motivo = faltantes.length
      ? `faltan criterios: ${faltantes.map((c) => c.texto).join('; ')}`
      : `puntuación ${puntos}, mínimo ${PUNTUACION_MINIMA}`;
    mensaje =
      `No aprobado (${motivo}). Sigue en el NIVEL ${progreso.nivel}. ` +
      'Explícale con cariño qué faltó, da un ejemplo concreto y propón practicar de nuevo.';
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

/** Mes en curso como "AAAA-MM" (hora UTC). */
export const mesDe = (fecha = new Date()) => fecha.toISOString().slice(0, 7);

/** Minutos de voz usados en el mes en curso. */
export function minutosDelMes(actual, ahora = new Date()) {
  const uso = normalizar(actual).uso;
  return uso?.mes === mesDe(ahora) ? Math.round(uso.segundos / 60) : 0;
}

/** Suma la duración de una sesión al uso del mes (se reinicia al cambiar de mes). */
export function aplicarUso(actual, segundos, ahora = new Date()) {
  const progreso = structuredClone(normalizar(actual));
  const duracion = Math.max(0, Math.min(4 * 3600, Math.round(Number(segundos) || 0)));
  if (!duracion) return { progreso, cambio: false, mensaje: 'Duración vacía.' };
  const mes = mesDe(ahora);
  const previo = progreso.uso?.mes === mes ? progreso.uso : { mes, segundos: 0, sesiones: 0 };
  progreso.uso = { mes, segundos: previo.segundos + duracion, sesiones: previo.sesiones + 1 };
  return { progreso, cambio: true, mensaje: 'Uso registrado.' };
}

/** El coach deja una tarea concreta para practicar entre sesiones. */
export function aplicarTarea(actual, texto) {
  const progreso = structuredClone(normalizar(actual));
  const tarea = String(texto ?? '').trim().slice(0, 600);
  if (!tarea) return { progreso, cambio: false, mensaje: 'Tarea vacía: no se guardó.' };
  progreso.tareas.push({
    id: Date.now().toString(36),
    texto: tarea,
    fecha: new Date().toISOString(),
    reflexion: '',
  });
  progreso.tareas = progreso.tareas.slice(-MAX_TAREAS_GUARDADAS);
  return { progreso, cambio: true, mensaje: 'Tarea guardada: el usuario la verá en la app.' };
}

/** El usuario anota cómo le fue con una tarea. */
export function aplicarReflexion(actual, id, texto) {
  const progreso = structuredClone(normalizar(actual));
  const tarea = progreso.tareas.find((t) => t.id === id);
  const reflexion = String(texto ?? '').trim().slice(0, 2000);
  if (!tarea || !reflexion) return { progreso, cambio: false, mensaje: 'No se encontró la tarea o el texto está vacío.' };
  tarea.reflexion = reflexion;
  tarea.fechaReflexion = new Date().toISOString();
  return { progreso, cambio: true, mensaje: 'Reflexión guardada.' };
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
