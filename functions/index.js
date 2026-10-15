import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { setGlobalOptions } from 'firebase-functions';
import { HttpsError, onCall } from 'firebase-functions/https';
import { defineInt, defineSecret, defineString } from 'firebase-functions/params';
import { GoogleGenAI } from '@google/genai';
import { configuracionLive } from './coach.js';
import {
  aplicarRecordatorio,
  clavesVapid,
  enviarNotificacion,
  idSuscripcion,
  mensajeRecordatorio,
} from './recordatorios.js';
import {
  aplicarTrato,
  aplicarBorrarPerfil,
  aplicarLeccion,
  aplicarPerfil,
  aplicarAvatar,
  aplicarAvance,
  aplicarCoach,
  aplicarDia,
  aplicarEvaluacion,
  aplicarFrase,
  aplicarProposito,
  aplicarReinicio,
  aplicarReflexion,
  aplicarResumen,
  aplicarTarea,
  aplicarUso,
  combinar,
  limpiarSituacion,
  minutosDelMes,
  normalizar,
  progresoInicial,
  SEGUNDOS_PARA_CONTAR_DIA,
} from './progreso.js';

initializeApp();
const db = getFirestore();

// Uso personal: pocas instancias como tope de gasto.
setGlobalOptions({ maxInstances: 3 });

const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');
// Único correo de Google autorizado a usar la app (el tuyo).
const EMAIL_PERMITIDO = defineString('EMAIL_PERMITIDO');
const GEMINI_MODEL = defineString('GEMINI_MODEL', { default: 'gemini-3.8-live' });
// Topes de gasto: minutos de voz por mes y duración máxima de cada sesión.
const LIMITE_MENSUAL_MIN = defineInt('LIMITE_MENSUAL_MIN', { default: 600 });
const LIMITE_SESION_MIN = defineInt('LIMITE_SESION_MIN', { default: 30 });

function usuarioAutorizado(request) {
  const token = request.auth?.token;
  if (!token) throw new HttpsError('unauthenticated', 'Inicia sesión con tu cuenta de Google.');
  const permitido = EMAIL_PERMITIDO.value().trim().toLowerCase();
  if (!permitido || !token.email_verified || token.email?.toLowerCase() !== permitido) {
    throw new HttpsError('permission-denied', 'Esta cuenta no tiene acceso a la app.');
  }
  return request.auth.uid;
}

const documento = (uid) => db.collection('usuarios').doc(uid);

async function leerProgreso(uid) {
  const snap = await documento(uid).get();
  return snap.exists ? normalizar(snap.data()) : progresoInicial();
}

// Lee, aplica una regla de progreso y guarda, todo dentro de una transacción
// para que la PC y el móvil no se pisen si escriben a la vez.
function actualizarProgreso(uid, regla) {
  return db.runTransaction(async (tx) => {
    const ref = documento(uid);
    const snap = await tx.get(ref);
    const resultado = regla(snap.exists ? normalizar(snap.data()) : progresoInicial());
    if (resultado.cambio) tx.set(ref, resultado.progreso);
    return resultado;
  });
}

function mensajeDeGemini(err) {
  try {
    return JSON.parse(err.message).error?.message ?? err.message;
  } catch {
    return err.message;
  }
}

/**
 * Crea un token temporal de un solo uso para que el navegador hable directo con
 * Gemini Live sin conocer la clave real, junto con la configuración de la sesión
 * armada con el progreso actual.
 */
export const crearSesion = onCall({ secrets: [GEMINI_API_KEY] }, async (request) => {
  const uid = usuarioAutorizado(request);
  const modo = request.data?.modo === 'practica' ? 'practica' : 'programa';
  const situacion = limpiarSituacion(request.data?.situacion);
  if (modo === 'practica' && situacion.length < 3) {
    throw new HttpsError('invalid-argument', 'Escribe qué situación quieres practicar.');
  }
  const progreso = await leerProgreso(uid);
  const limiteMensual = LIMITE_MENSUAL_MIN.value();
  if (minutosDelMes(progreso) >= limiteMensual) {
    throw new HttpsError(
      'resource-exhausted',
      `Llegaste al límite de ${limiteMensual} minutos de este mes. Se renueva el día 1 (o súbelo en LIMITE_MENSUAL_MIN).`,
    );
  }
  const clave = GEMINI_API_KEY.value().trim();
  if (!clave) {
    throw new HttpsError(
      'failed-precondition',
      'La clave de Gemini guardada está vacía. Ejecuta "Cambiar clave de Gemini.cmd" en tu PC.',
    );
  }
  const ai = new GoogleGenAI({ apiKey: clave, httpOptions: { apiVersion: 'v1alpha' } });
  const ahora = Date.now();
  let token;
  try {
    token = await ai.authTokens.create({
      config: {
        uses: 1,
        expireTime: new Date(ahora + 30 * 60 * 1000).toISOString(),
        newSessionExpireTime: new Date(ahora + 60 * 1000).toISOString(),
        httpOptions: { apiVersion: 'v1alpha' },
      },
    });
  } catch (err) {
    console.error('Error creando el token de Gemini:', err);
    throw new HttpsError('unavailable', `Gemini rechazó la solicitud: ${mensajeDeGemini(err)}`);
  }
  return {
    token: token.name,
    modelo: GEMINI_MODEL.value(),
    config: configuracionLive(progreso, {
      modo,
      situacion,
      manual: request.data?.manual === true,
      fecha: request.data?.fecha,
    }),
    limites: { sesionMin: LIMITE_SESION_MIN.value(), mensualMin: limiteMensual },
  };
});

export const registrarEvaluacion = onCall(async (request) => {
  const uid = usuarioAutorizado(request);
  const { mensaje } = await actualizarProgreso(uid, (p) => aplicarEvaluacion(p, request.data));
  return { mensaje };
});

export const guardarResumen = onCall(async (request) => {
  const uid = usuarioAutorizado(request);
  const { resumen, tipo, situacion } = request.data ?? {};
  const { mensaje } = await actualizarProgreso(uid, (p) => aplicarResumen(p, resumen, { tipo, situacion }));
  return { mensaje };
});

export const reiniciarProgreso = onCall(async (request) => {
  const uid = usuarioAutorizado(request);
  const { mensaje } = await actualizarProgreso(uid, aplicarReinicio);
  return { mensaje };
});

export const registrarUso = onCall(async (request) => {
  const uid = usuarioAutorizado(request);
  const { segundos, fecha } = request.data ?? {};
  // Una sesión de al menos un minuto cuenta como día practicado (fecha local del aparato).
  const regla =
    Number(segundos) >= SEGUNDOS_PARA_CONTAR_DIA
      ? combinar((p) => aplicarUso(p, segundos), (p) => aplicarDia(p, fecha))
      : (p) => aplicarUso(p, segundos);
  const { mensaje } = await actualizarProgreso(uid, regla);
  return { mensaje };
});

export const guardarProposito = onCall(async (request) => {
  const uid = usuarioAutorizado(request);
  const { mensaje } = await actualizarProgreso(uid, (p) => aplicarProposito(p, request.data?.proposito));
  return { mensaje };
});

export const asignarTarea = onCall(async (request) => {
  const uid = usuarioAutorizado(request);
  const { mensaje } = await actualizarProgreso(uid, (p) => aplicarTarea(p, request.data?.tarea));
  return { mensaje };
});

export const dejarFrase = onCall(async (request) => {
  const uid = usuarioAutorizado(request);
  const { mensaje } = await actualizarProgreso(uid, (p) => aplicarFrase(p, request.data?.frase));
  return { mensaje };
});

export const registrarAvance = onCall(async (request) => {
  const uid = usuarioAutorizado(request);
  const { mensaje } = await actualizarProgreso(uid, (p) => aplicarAvance(p, request.data));
  return { mensaje };
});

export const registrarReflexion = onCall(async (request) => {
  const uid = usuarioAutorizado(request);
  const { id, reflexion, fecha } = request.data ?? {};
  // Anotar cómo te fue con la tarea también es practicar.
  const { mensaje } = await actualizarProgreso(uid, (p) => {
    const anotada = aplicarReflexion(p, id, reflexion);
    return anotada.cambio ? combinar(() => anotada, (q) => aplicarDia(q, fecha))(p) : anotada;
  });
  return { mensaje };
});

// ---------- Recordatorios (notificaciones push) ----------

const suscripcionValida = (s) =>
  typeof s?.endpoint === 'string' && s.endpoint.startsWith('https://') && s.keys?.p256dh && s.keys?.auth;

/** Clave pública para que el navegador se suscriba a las notificaciones. */
export const configPush = onCall(async (request) => {
  usuarioAutorizado(request);
  const { publicKey } = await clavesVapid(db);
  return { clavePublica: publicKey };
});

/** Activa o desactiva el recordatorio diario y registra (o borra) la suscripción de este aparato. */
export const guardarRecordatorio = onCall(async (request) => {
  const uid = usuarioAutorizado(request);
  const { activo, hora, zona, suscripcion } = request.data ?? {};
  if (activo && !suscripcionValida(suscripcion)) {
    throw new HttpsError('invalid-argument', 'Falta la suscripción a notificaciones de este aparato.');
  }
  await actualizarProgreso(uid, (p) => aplicarRecordatorio(p, { activo, hora, zona }));
  if (suscripcionValida(suscripcion)) {
    const ref = db.collection('suscripciones').doc(idSuscripcion(suscripcion));
    if (activo) await ref.set({ uid, suscripcion, actualizada: new Date().toISOString() });
    else await ref.delete();
  }
  return { mensaje: activo ? 'Recordatorio activado.' : 'Recordatorio desactivado.' };
});

/** Manda ya mismo una notificación de prueba a este aparato. */
export const probarRecordatorio = onCall(async (request) => {
  const uid = usuarioAutorizado(request);
  const { suscripcion } = request.data ?? {};
  if (!suscripcionValida(suscripcion)) throw new HttpsError('invalid-argument', 'Suscripción inválida.');
  const resultado = await enviarNotificacion(await clavesVapid(db), suscripcion, mensajeRecordatorio(await leerProgreso(uid)));
  if (resultado !== 'ok') throw new HttpsError('unavailable', 'No se pudo enviar la notificación de prueba.');
  return { mensaje: 'Notificación enviada.' };
});

export const completarLeccion = onCall(async (request) => {
  const uid = usuarioAutorizado(request);
  const { leccion, evidencia, fecha } = request.data ?? {};
  const { mensaje } = await actualizarProgreso(uid, (p) => aplicarLeccion(p, { leccion, evidencia, fecha }));
  return { mensaje };
});

export const actualizarPerfil = onCall(async (request) => {
  const uid = usuarioAutorizado(request);
  const { mensaje } = await actualizarProgreso(uid, (p) => aplicarPerfil(p, request.data?.perfil));
  return { mensaje };
});

export const borrarPerfil = onCall(async (request) => {
  const uid = usuarioAutorizado(request);
  const { mensaje } = await actualizarProgreso(uid, aplicarBorrarPerfil);
  return { mensaje };
});

export const elegirTrato = onCall(async (request) => {
  const uid = usuarioAutorizado(request);
  const { mensaje } = await actualizarProgreso(uid, (p) => aplicarTrato(p, request.data?.trato));
  return { mensaje };
});

export const elegirAvatar = onCall(async (request) => {
  const uid = usuarioAutorizado(request);
  const { mensaje } = await actualizarProgreso(uid, (p) => aplicarAvatar(p, request.data?.avatar));
  return { mensaje };
});

export const elegirCoach = onCall(async (request) => {
  const uid = usuarioAutorizado(request);
  const { mensaje } = await actualizarProgreso(uid, (p) => aplicarCoach(p, request.data?.coach));
  return { mensaje };
});
