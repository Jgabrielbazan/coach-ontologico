import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { setGlobalOptions } from 'firebase-functions';
import { HttpsError, onCall } from 'firebase-functions/https';
import { defineSecret, defineString } from 'firebase-functions/params';
import { GoogleGenAI } from '@google/genai';
import { configuracionLive } from './coach.js';
import { aplicarEvaluacion, aplicarResumen, normalizar, progresoInicial } from './progreso.js';

initializeApp();
const db = getFirestore();

// Uso personal: pocas instancias como tope de gasto.
setGlobalOptions({ maxInstances: 3 });

const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');
// Único correo de Google autorizado a usar la app (el tuyo).
const EMAIL_PERMITIDO = defineString('EMAIL_PERMITIDO');
const GEMINI_MODEL = defineString('GEMINI_MODEL', { default: 'gemini-3.8-live' });

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
    config: configuracionLive(await leerProgreso(uid)),
  };
});

export const registrarEvaluacion = onCall(async (request) => {
  const uid = usuarioAutorizado(request);
  const { mensaje } = await actualizarProgreso(uid, (p) => aplicarEvaluacion(p, request.data));
  return { mensaje };
});

export const guardarResumen = onCall(async (request) => {
  const uid = usuarioAutorizado(request);
  const { mensaje } = await actualizarProgreso(uid, (p) => aplicarResumen(p, request.data?.resumen));
  return { mensaje };
});

export const reiniciarProgreso = onCall(async (request) => {
  const uid = usuarioAutorizado(request);
  await documento(uid).set(progresoInicial());
  return { mensaje: 'Programa reiniciado.' };
});
