import { defineConfig } from 'vite';

export default defineConfig({
  root: 'web',
  build: { outDir: '../dist', emptyOutDir: true },
  // En desarrollo, las llamadas a /api van al servidor de Node (npm run dev:server).
  server: { proxy: { '/api': 'http://localhost:3000' } },
});
