import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

export default defineConfig({
  root: 'web',
  // Versión y momento de la compilación, para mostrar en la app qué publicación se está viendo.
  define: {
    __VERSION__: JSON.stringify(version),
    __PUBLICADO__: JSON.stringify(new Date().toISOString()),
  },
  build: { outDir: '../dist', emptyOutDir: true },
  // En desarrollo, /__/firebase/init.json lo sirve el emulador de Hosting.
  server: { proxy: { '/__': 'http://localhost:5000' } },
});
