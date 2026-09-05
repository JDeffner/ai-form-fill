/**
 * `scripts/changelog-section.mjs` supplies the body of the GitHub release, so
 * the section it cuts out has to start and stop in the right place. The script
 * is run as the release workflow runs it, against the real CHANGELOG.
 */
import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const script = join(process.cwd(), 'scripts', 'changelog-section.mjs');

function section(version: string) {
  return execFileSync(process.execPath, [script, version], { encoding: 'utf8' });
}

describe('changelog-section', () => {
  it('prints one version section without the ones around it', () => {
    const body = section('2.0.0');

    expect(body).toContain('### Breaking');
    expect(body).not.toContain('## 2.0.0');
    expect(body).not.toContain('## 0.9.0');
  });

  it('reads a section that is not the first one', () => {
    expect(section('0.9.0')).toContain('Clean rewrite relative to the published 1.0.1');
  });

  it('fails on a version that has no section', () => {
    expect(() => section('9.9.9')).toThrow();
  });
});
