/**
 * The build has one entry per public import path. These checks read the
 * tracked `dist/` output, so they only mean something after `pnpm build`.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// Vitest runs from the project root; `import.meta.url` is not a file URL in
// the jsdom environment, so resolve against the working directory instead.
const dist = (file: string) => join(process.cwd(), 'dist', file);
const read = (file: string) => readFileSync(dist(file), 'utf8');
const built = existsSync(dist('ai-form-fill.js')) && existsSync(dist('voice.js'));

if (!built) {
  console.warn('tests/build/entries: dist/ is missing or stale. Run `pnpm build` first.');
}

describe.skipIf(!built)('build entry points', () => {
  it('emits both entries as ESM and CJS, with types', () => {
    for (const file of [
      'ai-form-fill.js',
      'ai-form-fill.cjs',
      'ai-form-fill.d.ts',
      'voice.js',
      'voice.cjs',
      'voice.d.ts',
    ]) {
      expect(existsSync(dist(file)), `dist/${file} is missing`).toBe(true);
    }
  });

  it('keeps speech code out of the core bundle', () => {
    const core = read('ai-form-fill.js');

    expect(core).not.toContain('SpeechRecognition');
    expect(core).not.toMatch(/from\s*["'][^"']*voice/);
  });

  it('exports the dictation API from the voice entry', () => {
    expect(read('voice.js')).toMatch(/export\s*\{[^}]*createDictation/);
    expect(read('voice.cjs')).toContain('createDictation');
    expect(read('voice.d.ts')).toContain('declare function createDictation');
  });

  it('keeps the HTMLElementEventMap augmentation in the core declarations', () => {
    const types = read('ai-form-fill.d.ts');

    expect(types).toContain('declare global {');
    expect(types.indexOf('declare global {')).toBeGreaterThan(types.indexOf('declare function'));
  });
});
