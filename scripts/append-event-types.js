/**
 * API Extractor drops `declare global` blocks when it rolls the declaration
 * files up into one bundle, so the `HTMLElementEventMap` augmentation that
 * types `form.addEventListener('aff:done', ...)` for consumers would be lost.
 *
 * This step appends that block, read straight from its source file, to the
 * rolled-up bundle. It runs as the last step of `pnpm build` and is
 * idempotent, so rebuilding an up-to-date `dist/` changes nothing.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const SOURCE = 'lib/core/events.ts';
const BUNDLE = 'dist/ai-form-fill.d.ts';
const MARKER = 'declare global {';

const source = readFileSync(SOURCE, 'utf8');
const start = source.indexOf(MARKER);
if (start === -1) {
  throw new Error(`No "${MARKER}" block found in ${SOURCE}.`);
}

const bundle = readFileSync(BUNDLE, 'utf8');
if (!bundle.includes(MARKER)) {
  writeFileSync(BUNDLE, `${bundle.trimEnd()}\n\n${source.slice(start).trimEnd()}\n`);
}
