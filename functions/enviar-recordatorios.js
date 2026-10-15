// Envía los recordatorios que correspondan a esta hora. Lo ejecuta GitHub Actions
// cada hora (.github/workflows/recordatorios.yml) con la cuenta de publicación.
// No se publica como función (está excluido en firebase.json).
import { readFileSync } from 'node:fs';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { clavesVapid, debeEnviar, enviarNotificacion, mensajeRecordatorio } from './recordatorios.js';

const proyecto =
  process.env.GOOGLE_CLOUD_PROJECT ||
  JSON.parse(readFileSync(new URL('../.firebaserc', import.meta.url), 'utf8')).projects.default;

initializeApp({ projectId: proyecto });
const db = getFirestore();
const ahora = new Date();
const claves = await clavesVapid(db);

const usuarios = await db.collection('usuarios').where('recordatorio.activo', '==', true).get();
let enviados = 0;
for (const usuario of usuarios.docs) {
  const datos = usuario.data();
  const { enviar, fecha } = debeEnviar(datos.recordatorio, ahora);
  if (!enviar) continue;

  const suscripciones = await db.collection('suscripciones').where('uid', '==', usuario.id).get();
  const mensaje = mensajeRecordatorio(datos);
  for (const doc of suscripciones.docs) {
    const resultado = await enviarNotificacion(claves, doc.data().suscripcion, mensaje);
    if (resultado === 'ok') enviados++;
    if (resultado === 'vencida') await doc.ref.delete(); // el navegador la dio de baja
  }
  await usuario.ref.update({ 'recordatorio.ultimoEnvio': fecha });
}
console.log(`Usuarios con recordatorio: ${usuarios.size} · notificaciones enviadas: ${enviados}`);
