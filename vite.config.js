///<reference types="vitest/config" />
import { createReadStream, readFileSync, writeFileSync } from 'node:fs';
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

// API Extractor drops `declare global` blocks when it rolls the declaration
// files up into one bundle, so the `HTMLElementEventMap` augmentation that
// types `form.addEventListener('aff:done', ...)` for consumers would be lost.
// This appends that block, read straight from its source file, to the core
// entry's bundle (no other entry augments a global). It runs after the
// declaration build and is idempotent, so rebuilding an up-to-date `dist/`
// changes nothing.
const EVENT_TYPES_SOURCE = resolve(__dirname, 'lib/core/events.ts');
const CORE_TYPES_BUNDLE = resolve(__dirname, 'dist/ai-form-fill.d.ts');
const GLOBAL_MARKER = 'declare global {';

function appendGlobalEventTypes() {
  const source = readFileSync(EVENT_TYPES_SOURCE, 'utf8');
  const start = source.indexOf(GLOBAL_MARKER);
  if (start === -1) {
    throw new Error(`No "${GLOBAL_MARKER}" block found in ${EVENT_TYPES_SOURCE}.`);
  }
  const bundle = readFileSync(CORE_TYPES_BUNDLE, 'utf8');
  if (bundle.includes(GLOBAL_MARKER)) return;
  writeFileSync(CORE_TYPES_BUNDLE, `${bundle.trimEnd()}\n\n${source.slice(start).trimEnd()}\n`);
}

// `examples/vanilla.html` loads the script-tag bundle by relative path, so the
// copy in `site/examples/` works under the GitHub Pages base path without
// knowing what that base is. In dev the page is served from `/examples/`,
// where nothing is built, so serve that one URL from `dist/` instead.
const serveBrowserBundle = {
  name: 'aff-serve-browser-bundle',
  apply: 'serve',
  configureServer(server) {
    server.middlewares.use('/examples/ai-form-fill.browser.js', (_req, res) => {
      res.setHeader('Content-Type', 'text/javascript');
      createReadStream(resolve(__dirname, 'dist/ai-form-fill.browser.js')).pipe(res);
    });
  },
};

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
        // One entry per public import path. `ai-form-fill/voice` and
        // `ai-form-fill/ui` are separate so the core bundle carries neither
        // speech code nor markup.
        // The entry key is the output file name, so the core keeps the names
        // it has always had: dist/ai-form-fill.js, .cjs and .d.ts.
        entry: {
          'ai-form-fill': resolve(__dirname, 'lib/index.ts'),
          voice: resolve(__dirname, 'lib/voice/index.ts'),
          ui: resolve(__dirname, 'lib/ui/index.ts'),
          react: resolve(__dirname, 'lib/react/index.ts'),
        },
        formats: ['es', 'cjs'],
        fileName: (format, entryName) => `${entryName}.${format === 'cjs' ? 'cjs' : 'js'}`,
      },
      rollupOptions: {
        // The library has no runtime dependencies. `react` is an optional
        // peer dependency of the `ai-form-fill/react` entry only, so it is
        // left to the consumer's bundler instead of being inlined.
        external: ['react'],
      },
    },
    plugins: [
      // Demo app only; neither plugin touches the lib build (no tsx/css in lib/).
      react(),
      tailwindcss(),
      // `prefix` makes the plugin intercept /api/* without a server.proxy entry.
      mockDevServerPlugin({ prefix: '^/api' }),
      serveBrowserBundle,
      dts({
        // Only the library. Without this, `declare module` blocks from the
        // demo app (the JSX augmentation for <ai-form-fill>) end up in every
        // rolled-up declaration file.
        include: ['lib/**/*.ts'],
        insertTypesEntry: true,
        rollupTypes: true,
        tsconfigPath: './tsconfig.json',
        afterBuild: appendGlobalEventTypes,
      }),
    ],
    test: {
      projects: [
        {
          extends: true,
          test: {
            name: 'unit',
            environment: 'jsdom',
            include: ['tests/**/*.test.{ts,tsx}'],
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
