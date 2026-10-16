import { initializeApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  connectAuthEmulator,
  getAuth,
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from 'firebase/auth';
import { connectFirestoreEmulator, doc, getFirestore, onSnapshot } from 'firebase/firestore';
import { connectFunctionsEmulator, getFunctions, httpsCallable } from 'firebase/functions';

// Con los emuladores locales (npm run emuladores) todo apunta a localhost.
const EN_LOCAL = ['localhost', '127.0.0.1'].includes(location.hostname);

let auth;
let db;
let functions;

/** Firebase Hosting publica la configuración del proyecto en esta ruta: no hace falta copiarla a mano. */
export async function iniciarFirebase() {
  const respuesta = await fetch('/__/firebase/init.json');
  if (!respuesta.ok) throw new Error('No encontré la configuración de Firebase (/__/firebase/init.json).');
  const app = initializeApp(await respuesta.json());
  auth = getAuth(app);
  db = getFirestore(app);
  functions = getFunctions(app);
  if (EN_LOCAL) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
    connectFunctionsEmulator(functions, '127.0.0.1', 5001);
  }
  // Completa un inicio de sesión por redirección, si lo hubo.
  getRedirectResult(auth).catch(() => {});
}

export const alCambiarUsuario = (callback) => onAuthStateChanged(auth, callback);

export async function entrarConGoogle() {
  const proveedor = new GoogleAuthProvider();
  proveedor.setCustomParameters({ prompt: 'select_account' });
  try {
    await signInWithPopup(auth, proveedor);
  } catch (err) {
    // Algunos navegadores (o la app instalada en iPhone) bloquean ventanas emergentes.
    if (['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment'].includes(err.code)) {
      await signInWithRedirect(auth, proveedor);
    } else if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
      throw err;
    }
  }
}

export const salir = () => signOut(auth);

/** Escucha el progreso en vivo: si avanzas en el móvil, la PC se actualiza sola (y al revés). */
export function escucharProgreso(uid, callback, alError) {
  return onSnapshot(doc(db, 'usuarios', uid), (snap) => callback(snap.exists() ? snap.data() : null), alError);
}

export async function llamar(nombre, datos = {}) {
  try {
    const { data } = await httpsCallable(functions, nombre)(datos);
    return data;
  } catch (err) {
    // Los errores de las funciones llegan como "functions/xxx"; mostramos solo el texto y guardamos el código.
    const error = new Error((err.message || 'Error del servidor').replace(/\s*\[\d+\]$/, ''));
    error.code = err.code;
    throw error;
  }
}
