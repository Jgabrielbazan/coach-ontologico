import { createInterface } from 'node:readline';

// Lee respuestas línea por línea (funciona igual escribiendo a mano o con texto pegado).
const lineas = createInterface({ input: process.stdin })[Symbol.asyncIterator]();

export async function preguntar(texto) {
  process.stdout.write(texto);
  const { value, done } = await lineas.next();
  if (done) {
    console.error('\nNo recibí respuesta.');
    process.exit(1);
  }
  return value.trim();
}

export const terminar = () => process.stdin.destroy();
