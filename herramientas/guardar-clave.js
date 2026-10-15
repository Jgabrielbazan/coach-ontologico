// Pide la clave de Google AI Studio en un campo visible (el pegado funciona
// siempre), la verifica con Google y la guarda como secreto de Firebase.
// La clave solo pasa por esta PC y por Google: no queda en ningún archivo.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { preguntar, terminar } from './preguntar.js';

const MODELO = 'gemini-3.8-live';

const motivo = async (respuesta) =>
  (await respuesta.json().catch(() => ({}))).error?.message ?? `error ${respuesta.status}`;

// Hace lo mismo que la app al empezar una sesión (crear un token temporal de
// Gemini Live), así sabemos que la clave sirve de verdad antes de guardarla.
async function verificar(clave) {
  const token = await fetch('https://generativelanguage.googleapis.com/v1alpha/auth_tokens', {
    method: 'POST',
    headers: { 'x-goog-api-key': clave, 'content-type': 'application/json' },
    body: JSON.stringify({ uses: 1, expireTime: new Date(Date.now() + 60 * 1000).toISOString() }),
  });
  if (!token.ok) return { valida: false, motivo: await motivo(token) };

  const modelo = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODELO}`, {
    headers: { 'x-goog-api-key': clave },
  });
  if (!modelo.ok) {
    return { valida: true, aviso: `la clave funciona, pero Google no encontró el modelo ${MODELO} (${await motivo(modelo)}).` };
  }
  return { valida: true };
}

let clave;
for (;;) {
  clave = (await preguntar('Pega tu clave de Google AI Studio (clic derecho) y pulsa Enter: ')).replace(/\s+/g, '');
  if (clave.length < 20) {
    console.log('  Eso no parece una clave (quedó vacío o muy corto). Cópiala de https://aistudio.google.com/apikey');
    continue;
  }
  process.stdout.write('  Verificando la clave con Google... ');
  let resultado;
  try {
    resultado = await verificar(clave);
  } catch (err) {
    console.log(`no pude conectarme (${err.message}). Revisa tu conexión a internet.`);
    continue;
  }
  if (resultado.valida) {
    console.log('correcta.');
    if (resultado.aviso) console.log(`  Aviso: ${resultado.aviso}`);
    break;
  }
  console.log(`Google la rechazó: ${resultado.motivo}`);
  console.log('  Revisa que la copiaste completa. Si no funciona, crea una nueva en https://aistudio.google.com/apikey');
}
terminar();

const carpeta = mkdtempSync(path.join(tmpdir(), 'coach-'));
const archivo = path.join(carpeta, 'clave.txt');
try {
  writeFileSync(archivo, clave, { mode: 0o600 });
  const resultado = spawnSync('npx', ['firebase', 'functions:secrets:set', 'GEMINI_API_KEY', '--data-file', archivo, '--force'], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (resultado.status !== 0) process.exit(resultado.status ?? 1);
  console.log('Clave guardada en Firebase.');
} finally {
  rmSync(carpeta, { recursive: true, force: true });
}
