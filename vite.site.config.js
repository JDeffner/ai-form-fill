import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const __dirname = dirname(fileURLToPath(import.meta.url));

// The GitHub Pages build of the demo app (`pnpm build:site`). It is a separate
// config because `vite.config.js` builds the library, not a site, and because
// the dev-only mock proxies and the declaration plugin have no place here.
// The app is hash-routed, so it needs no server-side rewrite rules.
export default defineConfig({
  // The site is served from https://jdeffner.github.io/ai-form-fill/.
  base: '/ai-form-fill/',
  resolve: { alias: { '@': resolve(__dirname, 'examples') } },
  build: {
    outDir: 'site',
    emptyOutDir: true,
    rollupOptions: { input: resolve(__dirname, 'index.html') },
  },
  plugins: [react(), tailwindcss()],
});
