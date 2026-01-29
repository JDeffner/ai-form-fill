///<reference types="vitest/config" />
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts';
import { mockDevServerPlugin } from 'vite-plugin-mock-dev-server'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'lib/core/main.ts'),
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
    mockDevServerPlugin(),
    dts({ 
      insertTypesEntry: true ,
      rollupTypes: true,
      tsconfigPath: './tsconfig.json',
    })
  ],
  server: {
    proxy: {
      '^/api': 'http://example.com/',  // Plugin watches this pattern
    },
  },
  test: {
    environment: 'jsdom',
  },
})