#!/usr/bin/env node
/**
 * Second half of `pnpm build:site`, after `vite build -c vite.site.config.js`.
 *
 * `examples/vanilla.html` is a static page that is not part of the React app,
 * so Vite does not emit it. Copy it into `site/examples/` together with the
 * script-tag bundle it loads: the page references the bundle relatively
 * (`./ai-form-fill.browser.js`), so the pair works under the `/ai-form-fill/`
 * base path without knowing what that base is.
 */
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const target = join(root, 'site', 'examples');

const files = [
  [join(root, 'examples', 'vanilla.html'), join(target, 'vanilla.html')],
  [join(root, 'dist', 'ai-form-fill.browser.js'), join(target, 'ai-form-fill.browser.js')],
];

mkdirSync(target, { recursive: true });

for (const [from, to] of files) {
  if (!existsSync(from)) {
    console.error(`Missing ${from}. Run \`pnpm build\` first.`);
    process.exit(1);
  }
  copyFileSync(from, to);
}

console.log(`Copied the static demo page and the script-tag bundle into ${target}.`);
