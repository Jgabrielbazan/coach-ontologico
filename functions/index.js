import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { setGlobalOptions } from 'firebase-functions';
import { HttpsError, onCall } from 'firebase-functions/https';
import { defineInt, defineSecret, defineString } from 'firebase-functions/params';
import { GoogleGenAI } from '@google/genai';
import { configuracionLive } from './coach.js';
import { normalizarCorreo, resolverAcceso, resumenUsuario, validarInvitacion } from './acceso.js';
import {
  aplicarRecordatorio,
  clavesVapid,
  enviarNotificacion,
  idSuscripcion,
  mensajeRecordatorio,
} from './recordatorios.js';
import {
  aplicarDerivacion,
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
// Correo del administrador: usa la app y puede invitar a otras personas.
const EMAIL_PERMITIDO = defineString('EMAIL_PERMITIDO');
// Minutos por mes que recibe una persona invitada si no se indica otro límite.
const LIMITE_INVITADO_MIN = defineInt('LIMITE_INVITADO_MIN', { default: 120 });
const GEMINI_MODEL = defineString('GEMINI_MODEL', { default: 'gemini-3.8-live' });
// Topes de gasto: minutos de voz por mes y duración máxima de cada sesión.
const LIMITE_MENSUAL_MIN = defineInt('LIMITE_MENSUAL_MIN', { default: 600 });
const LIMITE_SESION_MIN = defineInt('LIMITE_SESION_MIN', { default: 30 });

const invitacionDe = (correo) => db.collection('invitados').doc(correo);

/**
 * Comprueba que quien llama sea el administrador o una persona invitada.
 * Devuelve { uid, correo, admin, limiteMensualMin }.
 */
async function usuarioAutorizado(request) {
  const token = request.auth?.token;
  if (!token) throw new HttpsError('unauthenticated', 'Inicia sesión con tu cuenta de Google.');
  const correoAdmin = EMAIL_PERMITIDO.value();
  const correo = normalizarCorreo(token.email);
  const esAdmin = correo && correo === normalizarCorreo(correoAdmin);
  const invitacion = !esAdmin && correo ? await invitacionDe(correo).get() : null;
  const acceso = resolverAcceso(token, correoAdmin, invitacion?.exists ? invitacion.data() : null);
  if (!acceso.acceso) {
    throw new HttpsError(
      'permission-denied',
      `La cuenta ${correo || 'que usaste'} todavía no tiene acceso. Pídele a quien administra la app que te invite.`,
    );
  }
  return {
    uid: request.auth.uid,
    correo: acceso.correo,
    admin: acceso.admin,
    limiteMensualMin: acceso.admin ? LIMITE_MENSUAL_MIN.value() : (acceso.limiteMensualMin ?? LIMITE_INVITADO_MIN.value()),
  };
}

async function soloAdmin(request) {
  const cuenta = await usuarioAutorizado(request);
  if (!cuenta.admin) throw new HttpsError('permission-denied', 'Solo quien administra la app puede hacer esto.');
  return cuenta;
}

const documento = (uid) => db.collection('usuarios').doc(uid);

async function leerProgreso(uid) {
  const snap = await documento(uid).get();
  return snap.exists ? normalizar(snap.data()) : progresoInicial();
}

// Lee, aplica una regla de progreso y guarda, todo dentro de una transacción
// para que la PC y el móvil no se pisen si escriben a la vez. Guarda también el
// correo, para el panel del administrador.
function actualizarProgreso(cuenta, regla) {
  return db.runTransaction(async (tx) => {
    const ref = documento(cuenta.uid);
    const snap = await tx.get(ref);
    const resultado = regla(snap.exists ? normalizar(snap.data()) : progresoInicial());
    if (resultado.cambio) tx.set(ref, { ...resultado.progreso, email: cuenta.correo });
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
  const cuenta = await usuarioAutorizado(request);
  const modo = request.data?.modo === 'practica' ? 'practica' : 'programa';
  const situacion = limpiarSituacion(request.data?.situacion);
  if (modo === 'practica' && situacion.length < 3) {
    throw new HttpsError('invalid-argument', 'Escribe qué situación quieres practicar.');
  }
  const progreso = await leerProgreso(cuenta.uid);
  const limiteMensual = cuenta.limiteMensualMin;
  if (minutosDelMes(progreso) >= limiteMensual) {
    throw new HttpsError(
      'resource-exhausted',
      cuenta.admin
        ? `Llegaste al límite de ${limiteMensual} minutos de este mes. Se renueva el día 1 (o súbelo en LIMITE_MENSUAL_MIN).`
        : `Llegaste a tus ${limiteMensual} minutos de este mes. Se renueva el día 1; si necesitas más, pídeselo a quien administra la app.`,
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
  const cuenta = await usuarioAutorizado(request);
  const { mensaje } = await actualizarProgreso(cuenta, (p) => aplicarEvaluacion(p, request.data));
  return { mensaje };
});

export const guardarResumen = onCall(async (request) => {
  const cuenta = await usuarioAutorizado(request);
  const { resumen, tipo, situacion } = request.data ?? {};
  const { mensaje } = await actualizarProgreso(cuenta, (p) => aplicarResumen(p, resumen, { tipo, situacion }));
  return { mensaje };
});

export const reiniciarProgreso = onCall(async (request) => {
  const cuenta = await usuarioAutorizado(request);
  const { mensaje } = await actualizarProgreso(cuenta, aplicarReinicio);
  return { mensaje };
});

export const registrarUso = onCall(async (request) => {
  const cuenta = await usuarioAutorizado(request);
  const { segundos, fecha } = request.data ?? {};
  // Una sesión de al menos un minuto cuenta como día practicado (fecha local del aparato).
  const regla =
    Number(segundos) >= SEGUNDOS_PARA_CONTAR_DIA
      ? combinar((p) => aplicarUso(p, segundos), (p) => aplicarDia(p, fecha))
      : (p) => aplicarUso(p, segundos);
  const { mensaje } = await actualizarProgreso(cuenta, regla);
  return { mensaje };
});

export const guardarProposito = onCall(async (request) => {
  const cuenta = await usuarioAutorizado(request);
  const { mensaje } = await actualizarProgreso(cuenta, (p) => aplicarProposito(p, request.data?.proposito));
  return { mensaje };
});

export const asignarTarea = onCall(async (request) => {
  const cuenta = await usuarioAutorizado(request);
  const { mensaje } = await actualizarProgreso(cuenta, (p) => aplicarTarea(p, request.data?.tarea));
  return { mensaje };
});

export const dejarFrase = onCall(async (request) => {
  const cuenta = await usuarioAutorizado(request);
  const { mensaje } = await actualizarProgreso(cuenta, (p) => aplicarFrase(p, request.data?.frase));
  return { mensaje };
});

export const registrarAvance = onCall(async (request) => {
  const cuenta = await usuarioAutorizado(request);
  const { mensaje } = await actualizarProgreso(cuenta, (p) => aplicarAvance(p, request.data));
  return { mensaje };
});

export const registrarReflexion = onCall(async (request) => {
  const cuenta = await usuarioAutorizado(request);
  const { id, reflexion, fecha } = request.data ?? {};
  // Anotar cómo te fue con la tarea también es practicar.
  const { mensaje } = await actualizarProgreso(cuenta, (p) => {
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
  await usuarioAutorizado(request);
  const { publicKey } = await clavesVapid(db);
  return { clavePublica: publicKey };
});

/** Activa o desactiva el recordatorio diario y registra (o borra) la suscripción de este aparato. */
export const guardarRecordatorio = onCall(async (request) => {
  const cuenta = await usuarioAutorizado(request);
  const { activo, hora, zona, suscripcion } = request.data ?? {};
  if (activo && !suscripcionValida(suscripcion)) {
    throw new HttpsError('invalid-argument', 'Falta la suscripción a notificaciones de este aparato.');
  }
  await actualizarProgreso(cuenta, (p) => aplicarRecordatorio(p, { activo, hora, zona }));
  if (suscripcionValida(suscripcion)) {
    const ref = db.collection('suscripciones').doc(idSuscripcion(suscripcion));
    if (activo) await ref.set({ uid: cuenta.uid, suscripcion, actualizada: new Date().toISOString() });
    else await ref.delete();
  }
  return { mensaje: activo ? 'Recordatorio activado.' : 'Recordatorio desactivado.' };
});

/** Manda ya mismo una notificación de prueba a este aparato. */
export const probarRecordatorio = onCall(async (request) => {
  const cuenta = await usuarioAutorizado(request);
  const { suscripcion } = request.data ?? {};
  if (!suscripcionValida(suscripcion)) throw new HttpsError('invalid-argument', 'Suscripción inválida.');
  const resultado = await enviarNotificacion(await clavesVapid(db), suscripcion, mensajeRecordatorio(await leerProgreso(cuenta.uid)));
  if (resultado !== 'ok') throw new HttpsError('unavailable', 'No se pudo enviar la notificación de prueba.');
  return { mensaje: 'Notificación enviada.' };
});

export const completarLeccion = onCall(async (request) => {
  const cuenta = await usuarioAutorizado(request);
  const { leccion, evidencia, fecha } = request.data ?? {};
  const { mensaje } = await actualizarProgreso(cuenta, (p) => aplicarLeccion(p, { leccion, evidencia, fecha }));
  return { mensaje };
});

export const actualizarPerfil = onCall(async (request) => {
  const cuenta = await usuarioAutorizado(request);
  const { mensaje } = await actualizarProgreso(cuenta, (p) => aplicarPerfil(p, request.data?.perfil));
  return { mensaje };
});

export const borrarPerfil = onCall(async (request) => {
  const cuenta = await usuarioAutorizado(request);
  const { mensaje } = await actualizarProgreso(cuenta, aplicarBorrarPerfil);
  return { mensaje };
});

export const registrarDerivacion = onCall(async (request) => {
  const cuenta = await usuarioAutorizado(request);
  const { estado, motivo } = request.data ?? {};
  const { mensaje } = await actualizarProgreso(cuenta, (p) => aplicarDerivacion(p, { estado, motivo }));
  return { mensaje };
});

export const elegirTrato = onCall(async (request) => {
  const cuenta = await usuarioAutorizado(request);
  const { mensaje } = await actualizarProgreso(cuenta, (p) => aplicarTrato(p, request.data?.trato));
  return { mensaje };
});

export const elegirAvatar = onCall(async (request) => {
  const cuenta = await usuarioAutorizado(request);
  const { mensaje } = await actualizarProgreso(cuenta, (p) => aplicarAvatar(p, request.data?.avatar));
  return { mensaje };
});

export const elegirCoach = onCall(async (request) => {
  const cuenta = await usuarioAutorizado(request);
  const { mensaje } = await actualizarProgreso(cuenta, (p) => aplicarCoach(p, request.data?.coach));
  return { mensaje };
});

// ---------- Cuentas: quién soy y panel del administrador ----------

/** La app pregunta al entrar si la cuenta tiene acceso y si es administradora. */
export const quienSoy = onCall(async (request) => {
  const cuenta = await usuarioAutorizado(request);
  return { admin: cuenta.admin, correo: cuenta.correo, limiteMensualMin: cuenta.limiteMensualMin };
});

/** Personas invitadas y uso de cada una (sin perfil ni sesiones: eso es privado). */
export const panelAdmin = onCall(async (request) => {
  const admin = await soloAdmin(request);
  const ahora = new Date();
  const [invitados, usuarios] = await Promise.all([db.collection('invitados').get(), db.collection('usuarios').get()]);
  const porCorreo = new Map();
  for (const doc of usuarios.docs) {
    const datos = doc.data();
    if (datos.email) porCorreo.set(datos.email, resumenUsuario(datos, ahora));
  }
  const filas = [
    { correo: admin.correo, admin: true, limiteMensualMin: admin.limiteMensualMin, uso: porCorreo.get(admin.correo) ?? null },
    ...invitados.docs.map((doc) => ({
      correo: doc.id,
      admin: false,
      limiteMensualMin: doc.data().limiteMensualMin,
      invitado: doc.data().fecha,
      uso: porCorreo.get(doc.id) ?? null,
    })),
  ];
  return { filas, limitePorDefecto: LIMITE_INVITADO_MIN.value() };
});

/** Invita a una persona (o cambia su límite de minutos). */
export const invitarUsuario = onCall(async (request) => {
  const admin = await soloAdmin(request);
  let invitacion;
  try {
    invitacion = validarInvitacion(request.data, LIMITE_INVITADO_MIN.value());
  } catch (err) {
    throw new HttpsError('invalid-argument', err.message);
  }
  if (invitacion.correo === admin.correo) throw new HttpsError('invalid-argument', 'Esa es tu propia cuenta.');
  const ref = invitacionDe(invitacion.correo);
  const previa = await ref.get();
  await ref.set({
    limiteMensualMin: invitacion.limiteMensualMin,
    fecha: previa.exists ? previa.data().fecha : ahoraISO(),
    actualizada: ahoraISO(),
  });
  return {
    mensaje: previa.exists
      ? `Límite de ${invitacion.correo} actualizado a ${invitacion.limiteMensualMin} min por mes.`
      : `Listo: ${invitacion.correo} ya puede entrar con su cuenta de Google.`,
  };
});

/** Quita el acceso a una persona (sus datos se conservan por si vuelve a ser invitada). */
export const quitarInvitado = onCall(async (request) => {
  await soloAdmin(request);
  const correo = normalizarCorreo(request.data?.email);
  if (!correo) throw new HttpsError('invalid-argument', 'Falta el correo.');
  await invitacionDe(correo).delete();
  return { mensaje: `${correo} ya no tiene acceso.` };
});

const ahoraISO = () => new Date().toISOString();
