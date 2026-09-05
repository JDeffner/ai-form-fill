#!/usr/bin/env node
/**
 * Prints the CHANGELOG.md section for one version, so the release workflow can
 * use it as the body of the GitHub release.
 *
 *   node scripts/changelog-section.mjs 2.0.0 [changelog-path]
 *
 * A section starts at `## <version>` (a date in brackets may follow) and ends
 * at the next `## ` heading. Exits 1 when the version has no section.
 */
import { readFileSync } from 'node:fs';
import process from 'node:process';

const version = process.argv[2];
if (!version) {
  console.error('usage: node scripts/changelog-section.mjs <version> [changelog-path]');
  process.exit(1);
}

const file = process.argv[3] ?? new URL('../CHANGELOG.md', import.meta.url);
const lines = readFileSync(file, 'utf8').split('\n');

// Versions only contain dots as regex metacharacters, so escaping those is
// enough. The trailing group keeps `2.0.0` from matching `2.0.0-rc.1`.
const heading = new RegExp('^## v?' + version.replace(/\./g, '\\.') + '(\\s|$)');

const start = lines.findIndex((line) => heading.test(line));
if (start === -1) {
  console.error(`No "## ${version}" section in ${file}.`);
  process.exit(1);
}

const rest = lines.slice(start + 1);
const end = rest.findIndex((line) => line.startsWith('## '));
const body = (end === -1 ? rest : rest.slice(0, end)).join('\n').trim();

process.stdout.write(`${body}\n`);
