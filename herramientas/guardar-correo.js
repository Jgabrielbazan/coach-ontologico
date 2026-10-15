// Pide el correo autorizado y lo guarda en functions/.env.
import { writeFileSync } from 'node:fs';
import { preguntar, terminar } from './preguntar.js';

let correo = '';
while (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
  correo = await preguntar('Correo de Google con el que vas a entrar a la app: ');
}
terminar();
writeFileSync('functions/.env', `EMAIL_PERMITIDO=${correo}\n`);
console.log(`Listo: solo ${correo} podrá usar la app.`);
