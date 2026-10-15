// Lee la lista de proyectos de Firebase (salida de `firebase projects:list --json`)
// y guarda el elegido en .firebaserc. Si hay uno solo, lo elige sin preguntar.
import { readFileSync, writeFileSync } from 'node:fs';
import { preguntar, terminar } from './preguntar.js';

const texto = readFileSync(process.argv[2], 'utf8');
// Por si npm o la CLI agregan avisos antes o después del JSON.
const datos = JSON.parse(texto.slice(texto.indexOf('{'), texto.lastIndexOf('}') + 1));
const proyectos = datos.result ?? [];
if (!proyectos.length) {
  console.error('No encontré proyectos de Firebase en esta cuenta. Revisa que entraste con la cuenta correcta.');
  process.exit(1);
}

let elegido = proyectos[0];
if (proyectos.length > 1) {
  console.log('Tus proyectos de Firebase:');
  proyectos.forEach((p, i) => console.log(`  ${i + 1}. ${p.displayName} (${p.projectId})`));
  for (;;) {
    const n = Number(await preguntar('Escribe el número del proyecto del coach: '));
    if (n >= 1 && n <= proyectos.length) {
      elegido = proyectos[n - 1];
      break;
    }
  }
}
terminar();

writeFileSync('.firebaserc', JSON.stringify({ projects: { default: elegido.projectId } }, null, 2) + '\n');
console.log(`Proyecto elegido: ${elegido.displayName} (${elegido.projectId})`);
