// Prepara la publicación automática desde GitHub:
//  1. Crea en tu proyecto de Google una cuenta de servicio "publicador-github"
//     con solo los permisos necesarios para publicar la app.
//  2. Genera su llave y la copia al portapapeles (no queda guardada en ningún archivo).
//  3. Abre GitHub en la página donde hay que pegarla, una sola vez.
// Usa la sesión de Firebase que ya iniciaste con "Instalar y publicar.cmd".
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const auth = require('firebase-tools/lib/auth');

const REPO = 'Jgabrielbazan/coach-ontologico';
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

const copiado = process.platform === 'win32' && spawnSync('clip', { input: contenido }).status === 0;
if (!copiado) {
  console.error('\nNo pude copiar la llave al portapapeles. Este paso está pensado para Windows.');
  process.exit(1);
}

const pagina = `https://github.com/${REPO}/settings/secrets/actions/new`;
spawnSync('cmd', ['/c', 'start', '', pagina], { stdio: 'ignore' });

console.log(`
==========================================================
 La llave ya está COPIADA. Se abrió GitHub en el navegador.
 (Si no se abrió: ${pagina})

 1. En "Name" escribe exactamente:   FIREBASE_SERVICE_ACCOUNT
 2. En "Secret" pega con Ctrl + V
 3. Pulsa "Add secret"

 Listo: desde ahora cada cambio se publica solo.
==========================================================`);
