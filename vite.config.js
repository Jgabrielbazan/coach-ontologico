import { defineConfig } from 'vite';

export default defineConfig({
  root: 'web',
  build: { outDir: '../dist', emptyOutDir: true },
  // En desarrollo, /__/firebase/init.json lo sirve el emulador de Hosting.
  server: { proxy: { '/__': 'http://localhost:5000' } },
});
