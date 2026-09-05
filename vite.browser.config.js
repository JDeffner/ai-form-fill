import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const __dirname = dirname(fileURLToPath(import.meta.url));

// The script-tag build, run after the main one (`pnpm build` does both).
// It is a separate config because it shares nothing with the library build:
// one self-contained IIFE file, minified, no declarations, and none of the
// demo-app plugins (react, tailwind, the dev mock server).
export default defineConfig({
  build: {
    // The main build already wrote dist/; do not wipe it.
    emptyOutDir: false,
    minify: true,
    lib: {
      entry: resolve(__dirname, 'lib/browser.ts'),
      name: 'AIFormFill',
      formats: ['iife'],
      fileName: () => 'ai-form-fill.browser.js',
    },
    rollupOptions: {
      // The library has no runtime dependencies, so nothing is external.
      external: [],
    },
  },
});
