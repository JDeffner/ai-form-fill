///<reference types="vitest/config" />
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import dts from 'vite-plugin-dts';
import { mockDevServerPlugin } from 'vite-plugin-mock-dev-server';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Provider API keys used only by the server-side dev mock proxies. Loaded with
// an empty prefix (so non-VITE_ names are read) and exposed via process.env,
// which esbuild does NOT inline — the secrets never land in a transpiled
// artifact or a client bundle.
const SERVER_ENV_KEYS = ['OPENAI_API_KEY', 'PERPLEXITY_API_KEY', 'OPENROUTER_API_KEY'];

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  for (const key of SERVER_ENV_KEYS) {
    if (env[key]) process.env[key] = env[key];
  }

  return {
    // `@/` points at the demo app (shadcn components live there). Dev-only:
    // the library entry (lib/) does not use it.
    resolve: { alias: { '@': resolve(__dirname, 'examples') } },
    build: {
      lib: {
        entry: resolve(__dirname, 'lib/index.ts'),
        name: 'AIFormFill',
        // the proper extensions will be added
        fileName: 'ai-form-fill',
      },
      rollupOptions: {
        // make sure to externalize deps that shouldn't be bundled
        // into your library
        external: [],
        output: {
          // Provide global variables to use in the UMD build
          // for externalized deps
          globals: {},
        },
      },
    },
    plugins: [
      // Demo app only; neither plugin touches the lib build (no tsx/css in lib/).
      react(),
      tailwindcss(),
      // `prefix` makes the plugin intercept /api/* without a server.proxy entry.
      mockDevServerPlugin({ prefix: '^/api' }),
      dts({
        insertTypesEntry: true,
        rollupTypes: true,
        tsconfigPath: './tsconfig.json',
      }),
    ],
    test: {
      projects: [
        {
          extends: true,
          test: {
            name: 'unit',
            environment: 'jsdom',
            include: ['tests/**/*.test.ts'],
            exclude: ['tests/integration/**'],
          },
        },
        {
          extends: true,
          test: {
            name: 'integration',
            environment: 'jsdom',
            include: ['tests/integration/**/*.test.ts'],
          },
        },
      ],
    },
  };
});
