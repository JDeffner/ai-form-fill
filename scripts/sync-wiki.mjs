/**
 * Push `docs/wiki/` to the GitHub wiki.
 *
 * The wiki pages are authored in this repository so they go through review like
 * any other change. This script clones the wiki repository into a temporary
 * directory, replaces its Markdown files with the ones in `docs/wiki/`, and
 * pushes. It does nothing when the content is already identical.
 *
 * Run it after a pull request that touches `docs/wiki/` is merged:
 *
 *   pnpm wiki:sync
 *
 * Needs push access to the wiki repository, which is the same access as the
 * code repository.
 */

import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const WIKI_REMOTE = 'https://github.com/JDeffner/ai-form-fill.wiki.git';
const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const source = join(repoRoot, 'docs', 'wiki');

/** Run a git command and return its trimmed stdout. */
function git(cwd, ...args) {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  }).trim();
}

const pages = readdirSync(source).filter((name) => name.endsWith('.md'));
if (pages.length === 0) {
  console.error(`No Markdown files in ${source}.`);
  process.exit(1);
}

const sha = git(repoRoot, 'rev-parse', '--short', 'HEAD');
const clone = mkdtempSync(join(tmpdir(), 'aff-wiki-'));

try {
  console.log(`Cloning ${WIKI_REMOTE}`);
  git(repoRoot, 'clone', '--depth', '1', WIKI_REMOTE, clone);

  for (const name of readdirSync(clone).filter((name) => name.endsWith('.md'))) {
    rmSync(join(clone, name));
  }
  for (const name of pages) {
    cpSync(join(source, name), join(clone, name));
  }

  git(clone, 'add', '-A');
  if (git(clone, 'status', '--porcelain') === '') {
    console.log('The wiki is already up to date.');
  } else {
    git(clone, 'commit', '-m', `docs: sync wiki from ${sha}`);
    git(clone, 'push');
    console.log(`Pushed ${pages.length} page(s) from ${sha}.`);
  }
} finally {
  rmSync(clone, { recursive: true, force: true });
}
