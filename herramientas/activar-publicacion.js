// Prepara la publicación automática desde GitHub:
//  1. Crea en tu proyecto de Google una cuenta de servicio "publicador-github"
//     con solo los permisos necesarios para publicar la app.
//  2. Genera su llave y la guarda cifrada como secreto del repo en GitHub
//     (tú solo autorizas GitHub en el navegador; no hay que copiar nada).
//  3. Si eso fallara, la abre en el Bloc de notas para pegarla a mano.
// Usa la sesión de Firebase que ya iniciaste con "Instalar y publicar.cmd".
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { preguntar, terminar } from './preguntar.js';

const require = createRequire(import.meta.url);
const auth = require('firebase-tools/lib/auth');
// libsodium viene con firebase-tools: cifra el secreto como exige GitHub.
const libsodium = createRequire(require.resolve('firebase-tools/package.json'))('libsodium-wrappers');

const REPO = 'Jgabrielbazan/coach-ontologico';
const NOMBRE_SECRETO = 'FIREBASE_SERVICE_ACCOUNT';
const ID_CUENTA = 'publicador-github';
const ROLES = [
  'roles/firebase.admin', // hosting, reglas de Firestore
  'roles/cloudfunctions.admin', // funciones
  'roles/run.admin', // las funciones de 2.ª generación corren en Cloud Run
  'roles/iam.serviceAccountUser', // ejecutar las funciones con su cuenta
  'roles/artifactregistry.admin', // imágenes de las funciones y su limpieza
  'roles/cloudbuild.builds.editor', // compilar las funciones
  'roles/secretmanager.admin', // dar acceso a la clave de Gemini a las funciones
  'roles/serviceusage.serviceUsageAdmin', // comprobar que los servicios estén activos
];

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

function paso(texto) {
  console.log(`\n> ${texto}`);
}

const proyecto = JSON.parse(readFileSync('.firebaserc', 'utf8')).projects.default;
const cuenta = auth.getGlobalDefaultAccount();
if (!cuenta) {
  console.error('No hay una sesión de Firebase iniciada. Ejecuta primero "Instalar y publicar.cmd".');
  process.exit(1);
}
const { access_token: token } = await auth.getAccessToken(cuenta.tokens.refresh_token, [
  'https://www.googleapis.com/auth/cloud-platform',
]);

async function google(url, { metodo = 'GET', cuerpo } = {}) {
  const respuesta = await fetch(url, {
    method: metodo,
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
  const datos = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) {
    const error = new Error(datos.error?.message ?? `error ${respuesta.status}`);
    error.estado = respuesta.status;
    throw error;
  }
  return datos;
}

/** Reintenta mientras Google termina de activar servicios o propagar la cuenta nueva. */
async function conReintentos(tarea, intentos = 8) {
  for (let i = 1; ; i++) {
    try {
      return await tarea();
    } catch (err) {
      if (i >= intentos || ![400, 403, 404, 409].includes(err.estado)) throw err;
      await esperar(4000);
    }
  }
}

console.log(`Proyecto: ${proyecto}  ·  Sesión: ${cuenta.user.email}`);

paso('Activando los servicios de Google necesarios...');
for (const servicio of ['iam.googleapis.com', 'cloudresourcemanager.googleapis.com']) {
  await google(`https://serviceusage.googleapis.com/v1/projects/${proyecto}/services/${servicio}:enable`, {
    metodo: 'POST',
    cuerpo: {},
  });
}

paso('Creando la cuenta de publicación...');
const correo = `${ID_CUENTA}@${proyecto}.iam.gserviceaccount.com`;
await conReintentos(async () => {
  try {
    await google(`https://iam.googleapis.com/v1/projects/${proyecto}/serviceAccounts`, {
      metodo: 'POST',
      cuerpo: { accountId: ID_CUENTA, serviceAccount: { displayName: 'Publicación automática desde GitHub' } },
    });
  } catch (err) {
    if (err.estado !== 409) throw err; // ya existía: la reutilizamos
  }
});
console.log(`  ${correo}`);

paso('Dándole solo los permisos para publicar...');
await conReintentos(async () => {
  const base = `https://cloudresourcemanager.googleapis.com/v1/projects/${proyecto}`;
  const politica = await google(`${base}:getIamPolicy`, { metodo: 'POST', cuerpo: {} });
  politica.bindings ??= [];
  const miembro = `serviceAccount:${correo}`;
  for (const rol of ROLES) {
    let vinculo = politica.bindings.find((b) => b.role === rol && !b.condition);
    if (!vinculo) politica.bindings.push((vinculo = { role: rol, members: [] }));
    if (!vinculo.members.includes(miembro)) vinculo.members.push(miembro);
  }
  await google(`${base}:setIamPolicy`, { metodo: 'POST', cuerpo: { policy: politica } });
});

paso('Generando la llave (y borrando las anteriores de esta cuenta)...');
const rutaCuenta = `https://iam.googleapis.com/v1/projects/${proyecto}/serviceAccounts/${correo}`;
const { keys: anteriores = [] } = await google(`${rutaCuenta}/keys?keyTypes=USER_MANAGED`);
for (const llave of anteriores) await google(`https://iam.googleapis.com/v1/${llave.name}`, { metodo: 'DELETE' });
const llave = await conReintentos(() =>
  google(`${rutaCuenta}/keys`, { metodo: 'POST', cuerpo: { privateKeyType: 'TYPE_GOOGLE_CREDENTIALS_FILE' } }),
);
const contenido = Buffer.from(llave.privateKeyData, 'base64').toString('utf8');

/** Guarda la llave cifrada como secreto del repo usando la API de GitHub. */
async function guardarEnGitHub(valor) {
  console.log('  Se abre GitHub en el navegador: pulsa "Authorize" (autorizar) para Firebase CLI.');
  const tokenGitHub = await auth.loginGithub();
  const cabeceras = {
    authorization: `token ${tokenGitHub}`,
    accept: 'application/vnd.github+json',
    'user-agent': 'coach-ontologico',
  };
  const base = `https://api.github.com/repos/${REPO}/actions/secrets`;
  const clave = await fetch(`${base}/public-key`, { headers: cabeceras });
  if (!clave.ok) throw new Error(`GitHub respondió ${clave.status} al pedir la clave pública del repo`);
  const { key, key_id } = await clave.json();
  await libsodium.ready;
  const cifrado = libsodium.crypto_box_seal(Buffer.from(valor), Buffer.from(key, 'base64'));
  const respuesta = await fetch(`${base}/${NOMBRE_SECRETO}`, {
    method: 'PUT',
    headers: { ...cabeceras, 'content-type': 'application/json' },
    body: JSON.stringify({ encrypted_value: Buffer.from(cifrado).toString('base64'), key_id }),
  });
  if (!respuesta.ok) throw new Error(`GitHub respondió ${respuesta.status} al guardar el secreto`);
}

/** Plan B: abre la llave en el Bloc de notas para copiarla a mano, y la borra al terminar. */
async function pegarAMano(valor) {
  const carpeta = mkdtempSync(path.join(tmpdir(), 'coach-'));
  const archivo = path.join(carpeta, 'llave-para-github.txt');
  writeFileSync(archivo, valor, { mode: 0o600 });
  const pagina = `https://github.com/${REPO}/settings/secrets/actions/new`;
  try {
    spawnSync('cmd', ['/c', 'start', '', pagina], { stdio: 'ignore' });
    spawnSync('cmd', ['/c', 'start', '', 'notepad', archivo], { stdio: 'ignore' });
    console.log(`
  Se abrieron GitHub y el Bloc de notas (si GitHub no se abrió: ${pagina}).
   1. En GitHub, "Nombre":  ${NOMBRE_SECRETO}
   2. En el Bloc de notas: Ctrl + A y luego Ctrl + C
   3. En GitHub, cuadro "Secreto": Ctrl + V  ->  "Agregar secreto"
   4. Cierra el Bloc de notas SIN guardar cambios.`);
    await preguntar('\n  Cuando termines, pulsa Enter aquí para borrar el archivo de la llave... ');
  } finally {
    terminar();
    rmSync(carpeta, { recursive: true, force: true });
  }
}

paso('Guardando la llave en GitHub...');
try {
  await guardarEnGitHub(contenido);
  terminar();
  console.log(`
==========================================================
 LISTO. La llave quedó guardada en GitHub como ${NOMBRE_SECRETO}.
 Desde ahora cada cambio se publica solo.
==========================================================`);
} catch (err) {
  console.log(`  No pude guardarla automáticamente (${err.message}). Vamos a pegarla a mano.`);
  await pegarAMano(contenido);
  console.log('\n  Listo. Revisa que en GitHub aparezca FIREBASE_SERVICE_ACCOUNT en "secretos del repositorio".');
}
