// Herramientas de práctica entre sesiones: la escalera de exposición (para los
// miedos), el cuaderno de aprendizajes con repaso espaciado y el informe semanal.
// Reglas puras: las usan el servidor y la app.
import { leccionesDe } from './programa.js';
import { diasUltimaSemana, normalizar, proximaLeccion, requisitosEvaluacion } from './progreso.js';

const DIA_MS = 86400000;
const MAX_ESCALONES = 10;
const MAX_INTENTOS = 30;
const MAX_CUADERNO = 120;
// Días hasta el próximo repaso según cuántas veces se repasó bien (repetición espaciada).
export const INTERVALOS_REPASO = [1, 3, 7, 14, 30, 60];

const limpiar = (texto, largo) => String(texto ?? '').replace(/\s+/g, ' ').trim().slice(0, largo);
const puntaje = (valor) => {
  const n = Math.round(Number(valor));
  return Number.isFinite(n) ? Math.min(10, Math.max(0, n)) : null;
};
const nuevoId = (prefijo) => `${prefijo}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
const sumarDias = (fecha, dias) => new Date(Date.parse(`${fecha}T12:00:00Z`) + dias * DIA_MS).toISOString().slice(0, 10);

function escaleraDe(progreso) {
  return { escalones: [...(progreso.escalera?.escalones ?? [])] };
}

// ---------- Escalera de exposición ----------

/** Un escalón está superado cuando, en el último intento, la ansiedad antes de hacerlo fue 3 o menos. */
export const escalonSuperado = (escalon) => {
  const ultimo = escalon.intentos?.at(-1);
  return Boolean(ultimo) && ultimo.antes <= 3;
};

/** El escalón que toca practicar: el más bajo todavía no superado. */
export const escalonActual = (escalera) => (escalera?.escalones ?? []).find((e) => !escalonSuperado(e)) ?? null;

const ordenar = (escalones) => escalones.sort((a, b) => a.nivel - b.nivel);

/** El coach arma (o rehace) la escalera; se conservan los intentos de los escalones que siguen igual. */
export function aplicarEscalera(actual, escalones) {
  const progreso = structuredClone(normalizar(actual));
  const previos = new Map(escaleraDe(progreso).escalones.map((e) => [e.texto.toLowerCase(), e]));
  const nuevos = (Array.isArray(escalones) ? escalones : [])
    .map((e) => ({ texto: limpiar(e?.texto, 140), nivel: puntaje(e?.nivel) }))
    .filter((e) => e.texto && e.nivel !== null)
    .slice(0, MAX_ESCALONES)
    .map((e) => {
      const previo = previos.get(e.texto.toLowerCase());
      return { id: previo?.id ?? nuevoId('e'), texto: e.texto, nivel: e.nivel, intentos: previo?.intentos ?? [] };
    });
  if (nuevos.length < 2) return { progreso, cambio: false, mensaje: 'La escalera necesita al menos 2 escalones con texto y nivel de 0 a 10.' };
  progreso.escalera = { escalones: ordenar(nuevos), actualizada: new Date().toISOString() };
  const primero = escalonActual(progreso.escalera);
  return {
    progreso,
    cambio: true,
    mensaje: `Escalera guardada (${nuevos.length} escalones; la persona la ve en la app). Primer escalón a practicar: «${primero.texto}».`,
  };
}

/** La persona agrega un escalón desde la app. */
export function aplicarAgregarEscalon(actual, { texto, nivel } = {}) {
  const progreso = structuredClone(normalizar(actual));
  const escalera = escaleraDe(progreso);
  const limpio = limpiar(texto, 140);
  const n = puntaje(nivel);
  if (!limpio || n === null) return { progreso, cambio: false, mensaje: 'Escribe la situación y su nivel (0 a 10).' };
  if (escalera.escalones.length >= MAX_ESCALONES) return { progreso, cambio: false, mensaje: `Máximo ${MAX_ESCALONES} escalones.` };
  escalera.escalones.push({ id: nuevoId('e'), texto: limpio, nivel: n, intentos: [] });
  progreso.escalera = { escalones: ordenar(escalera.escalones), actualizada: new Date().toISOString() };
  return { progreso, cambio: true, mensaje: 'Escalón agregado.' };
}

export function aplicarQuitarEscalon(actual, id) {
  const progreso = structuredClone(normalizar(actual));
  const escalera = escaleraDe(progreso);
  const restantes = escalera.escalones.filter((e) => e.id !== id);
  if (restantes.length === escalera.escalones.length) return { progreso, cambio: false, mensaje: 'No encontré ese escalón.' };
  progreso.escalera = { escalones: restantes, actualizada: new Date().toISOString() };
  return { progreso, cambio: true, mensaje: 'Escalón quitado.' };
}

/** Un intento real de exposición: ansiedad (0 a 10) antes y después, y una nota. */
export function aplicarExposicion(actual, { escalon, antes, despues, nota } = {}, ahora = new Date()) {
  const progreso = structuredClone(normalizar(actual));
  const escalera = escaleraDe(progreso);
  const paso = escalera.escalones.find((e) => e.id === escalon) ?? escalera.escalones.find((e) => e.texto.toLowerCase() === String(escalon ?? '').toLowerCase());
  const a = puntaje(antes);
  const d = puntaje(despues);
  if (!paso) return { progreso, cambio: false, mensaje: 'No encontré ese escalón de la escalera.' };
  if (a === null || d === null) return { progreso, cambio: false, mensaje: 'Faltan la ansiedad antes y después (0 a 10).' };
  const estabaSuperado = escalonSuperado(paso);
  paso.intentos = [...(paso.intentos ?? []), { fecha: ahora.toISOString(), antes: a, despues: d, nota: limpiar(nota, 300) }].slice(-MAX_INTENTOS);
  progreso.escalera = { ...escalera, escalones: ordenar(escalera.escalones) };
  const superado = !estabaSuperado && escalonSuperado(paso);
  const siguiente = escalonActual(progreso.escalera);
  const mensaje = superado
    ? `¡Escalón superado! («${paso.texto}»). Celébralo con la persona y nombra el avance concreto. ${
        siguiente ? `Próximo escalón: «${siguiente.texto}» (${siguiente.nivel}/10).` : '¡Completó toda la escalera!'
      }`
    : `Intento registrado: ansiedad ${a} → ${d}. Reconoce el coraje de haberlo hecho; la ansiedad baja con la repetición.`;
  return { progreso, cambio: true, mensaje };
}

/** Resumen de la escalera para el coach. */
export function textoEscalera(escalera) {
  const escalones = escalera?.escalones ?? [];
  if (!escalones.length) return '';
  const actual = escalonActual(escalera);
  const filas = [...escalones].reverse().map((e) => {
    const intentos = e.intentos ?? [];
    const recorrido = intentos.length ? `${intentos.length} intento(s), ansiedad antes: ${intentos.map((i) => i.antes).join(' → ')}` : 'sin intentos';
    const marca = escalonSuperado(e) ? '✓ superado' : e.id === actual?.id ? '➜ ACTUAL' : '';
    return `- [${e.id}] ${e.nivel}/10 «${e.texto}»: ${recorrido} ${marca}`.trim();
  });
  return `Su escalera de exposición (de la más difícil a la más fácil; datos del usuario):\n${filas.join('\n')}`;
}

// ---------- Cuaderno de aprendizajes y repaso espaciado ----------

/** Anota una distinción aprendida, en palabras de la persona, con un ejemplo de su vida. */
export function aplicarAprendizaje(actual, { distincion, explicacion, ejemplo, leccion } = {}, fecha, ahora = new Date()) {
  const progreso = structuredClone(normalizar(actual));
  const titulo = limpiar(distincion, 120);
  const texto = limpiar(explicacion, 600);
  if (!titulo || texto.length < 5) return { progreso, cambio: false, mensaje: 'Faltan la distinción y la explicación en sus palabras.' };
  const hoy = /^\d{4}-\d{2}-\d{2}$/.test(String(fecha ?? '')) ? fecha : ahora.toISOString().slice(0, 10);
  const cuaderno = [...(progreso.cuaderno ?? [])];
  cuaderno.push({
    id: nuevoId('c'),
    nivel: progreso.nivel,
    leccion: limpiar(leccion, 10),
    distincion: titulo,
    explicacion: texto,
    ejemplo: limpiar(ejemplo, 400),
    fecha: ahora.toISOString(),
    repaso: { proximo: sumarDias(hoy, INTERVALOS_REPASO[0]), paso: 0, veces: 0 },
  });
  progreso.cuaderno = cuaderno.slice(-MAX_CUADERNO);
  return { progreso, cambio: true, mensaje: `Anotado en su cuaderno: «${titulo}». Lo repasarán en los próximos días.` };
}

/** Resultado de un repaso: "bien" alarga el intervalo; "flojo" lo vuelve a 1 día. */
export function aplicarRepaso(actual, { id, resultado } = {}, fecha, ahora = new Date()) {
  const progreso = structuredClone(normalizar(actual));
  const entrada = (progreso.cuaderno ?? []).find((c) => c.id === id);
  if (!entrada) return { progreso, cambio: false, mensaje: 'No encontré esa entrada del cuaderno.' };
  const hoy = /^\d{4}-\d{2}-\d{2}$/.test(String(fecha ?? '')) ? fecha : ahora.toISOString().slice(0, 10);
  const bien = resultado === 'bien';
  const paso = bien ? Math.min(INTERVALOS_REPASO.length - 1, (entrada.repaso?.paso ?? 0) + 1) : 0;
  entrada.repaso = { proximo: sumarDias(hoy, INTERVALOS_REPASO[paso]), paso, veces: (entrada.repaso?.veces ?? 0) + 1, ultimo: hoy };
  return {
    progreso,
    cambio: true,
    mensaje: bien
      ? `Repaso registrado: lo domina; próximo repaso en ${INTERVALOS_REPASO[paso]} días.`
      : 'Repaso registrado: todavía le cuesta; lo repasarán mañana. Refuérzalo con un ejemplo de su vida.',
  };
}

/** Entradas del cuaderno que toca repasar (las más atrasadas primero). */
export function repasosPendientes(actual, fecha, ahora = new Date(), maximo = 2) {
  const hoy = /^\d{4}-\d{2}-\d{2}$/.test(String(fecha ?? '')) ? fecha : ahora.toISOString().slice(0, 10);
  return (normalizar(actual).cuaderno ?? [])
    .filter((c) => c.repaso?.proximo && c.repaso.proximo <= hoy)
    .sort((a, b) => a.repaso.proximo.localeCompare(b.repaso.proximo))
    .slice(0, maximo);
}

// ---------- Informe semanal ----------

/** Resumen de los últimos 7 días: práctica, lecciones, exposiciones, un avance y el foco que sigue. */
export function resumenSemanal(actual, ahora = new Date()) {
  const p = normalizar(actual);
  const desde = new Date(ahora.getTime() - 7 * DIA_MS).toISOString();
  const dias = diasUltimaSemana(p, ahora);
  const lecciones = p.lecciones.filter((l) => l.fecha >= desde).length;
  const exposiciones = (p.escalera?.escalones ?? []).flatMap((e) => e.intentos ?? []).filter((i) => i.fecha >= desde).length;
  const avance = p.evolucion.filter((a) => a.tipo === 'avance' && a.fecha >= desde).at(-1)?.cita ?? '';
  let foco;
  if (p.programaCompleto) foco = 'seguir practicando lo aprendido en tu vida real';
  else {
    const siguiente = proximaLeccion(p);
    const req = requisitosEvaluacion(p, ahora);
    foco = siguiente
      ? `la lección ${siguiente.id}, «${siguiente.titulo}»`
      : req.disponible
        ? `la evaluación del nivel ${p.nivel}`
        : `${req.faltantes[0]}`;
  }
  const partes = [`${dias} ${dias === 1 ? 'día' : 'días'} de práctica`];
  if (lecciones) partes.push(`${lecciones} ${lecciones === 1 ? 'lección' : 'lecciones'}`);
  if (exposiciones) partes.push(`${exposiciones} ${exposiciones === 1 ? 'exposición' : 'exposiciones'}`);
  const cuerpo = [
    `${partes.join(' · ')}.`,
    avance ? `Tu avance: «${avance.length > 80 ? `${avance.slice(0, 79)}…` : avance}».` : '',
    `Foco de la semana: ${foco}.`,
  ]
    .filter(Boolean)
    .join(' ');
  return { dias, lecciones, exposiciones, avance, foco, cuerpo, totalLecciones: leccionesDe(p.nivel).length };
}
