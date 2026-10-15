// Recordatorios diarios por notificación push (Web Push con claves VAPID).
// La lógica de "a quién y qué enviar" es pura y tiene pruebas; el envío lo hace
// enviar-recordatorios.js (GitHub Actions, cada hora) y la función probarRecordatorio.
import { createHash } from 'node:crypto';
import webpush from 'web-push';
import { NIVELES, PERFILES } from './coach.js';
import { normalizar } from './progreso.js';

// Margen para los atrasos del programador: si el aviso de las 20 h sale a las 21 h, vale igual.
const HORAS_DE_TOLERANCIA = 3;

export function zonaValida(zona) {
  try {
    new Intl.DateTimeFormat('es', { timeZone: zona });
    return true;
  } catch {
    return false;
  }
}

/** Fecha y hora locales de una zona horaria: { fecha: 'AAAA-MM-DD', hora: 0-23 }. */
export function horaLocal(zona, ahora = new Date()) {
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: zonaValida(zona) ? zona : 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(ahora)
      .map((p) => [p.type, p.value]),
  );
  return { fecha: `${partes.year}-${partes.month}-${partes.day}`, hora: Number(partes.hour) };
}

/** ¿Toca enviar hoy? Una vez por día local, a partir de la hora elegida. */
export function debeEnviar(recordatorio, ahora = new Date()) {
  if (!recordatorio?.activo) return { enviar: false };
  const { fecha, hora } = horaLocal(recordatorio.zona, ahora);
  const enHorario = hora >= recordatorio.hora && hora < recordatorio.hora + HORAS_DE_TOLERANCIA;
  return { enviar: enHorario && recordatorio.ultimoEnvio !== fecha, fecha };
}

/** Normaliza lo que manda la app y lo guarda en el progreso. */
export function aplicarRecordatorio(actual, { activo, hora, zona } = {}) {
  const progreso = structuredClone(normalizar(actual));
  const horaNum = Math.round(Number(hora));
  progreso.recordatorio = {
    ...(progreso.recordatorio ?? {}),
    activo: Boolean(activo),
    hora: Number.isFinite(horaNum) ? Math.min(23, Math.max(0, horaNum)) : 20,
    zona: zonaValida(zona) ? zona : 'UTC',
  };
  return { progreso, cambio: true, mensaje: 'Recordatorio guardado.' };
}

const recortar = (texto, largo) => (texto.length > largo ? `${texto.slice(0, largo - 1)}…` : texto);

/** Texto de la notificación según el momento del usuario. */
export function mensajeRecordatorio(datos) {
  const p = normalizar(datos);
  const nombre = (PERFILES[p.coach] ?? PERFILES.femenino).nombre;
  const tarea = p.tareas.at(-1);
  if (tarea && !tarea.reflexion) {
    return { titulo: `${nombre}: ¿cómo vas con tu tarea?`, cuerpo: recortar(tarea.texto, 140) };
  }
  if (p.programaCompleto) {
    return { titulo: `${nombre} te espera`, cuerpo: 'Unos minutos de práctica libre hoy: ¿qué conversación tienes pendiente?' };
  }
  return {
    titulo: `${nombre} te espera`,
    cuerpo: `Unos minutos hoy para seguir con el Nivel ${p.nivel}: ${NIVELES[p.nivel]}.`,
  };
}

/** Id estable de una suscripción (el endpoint es único por navegador). */
export const idSuscripcion = (suscripcion) => createHash('sha256').update(String(suscripcion?.endpoint)).digest('hex');

/**
 * Claves VAPID del proyecto: se generan la primera vez y quedan en Firestore
 * (config/push), que las reglas no dejan leer a ningún cliente.
 */
export async function clavesVapid(db) {
  const ref = db.collection('config').doc('push');
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists) return snap.data();
    const nuevas = webpush.generateVAPIDKeys();
    tx.set(ref, nuevas);
    return nuevas;
  });
}

/** Envía una notificación. Devuelve 'ok', 'vencida' (borrar la suscripción) o 'error'. */
export async function enviarNotificacion(claves, suscripcion, mensaje) {
  try {
    await webpush.sendNotification(
      suscripcion,
      JSON.stringify({ titulo: mensaje.titulo, cuerpo: mensaje.cuerpo, url: '/' }),
      {
        vapidDetails: { subject: 'mailto:coach@agent-ontologico.web.app', ...claves },
        TTL: 6 * 3600,
      },
    );
    return 'ok';
  } catch (err) {
    if (err.statusCode === 404 || err.statusCode === 410) return 'vencida';
    console.error('Error enviando notificación:', err.statusCode, err.body ?? err.message);
    return 'error';
  }
}
