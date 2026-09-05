# Releasing

This page describes how a version gets out: the version policy, the tag flow, what CI does, and the
manual npm publish. Only the owner releases.

## Version policy

Semantic versioning. The public surface is everything exported from the four entry points, the
element's attributes, properties, parts and `--aff-*` properties, and the `aff:*` event payloads.

| Change                                                 | Bump  |
| ------------------------------------------------------ | ----- |
| Removing or renaming an export, an attribute or a part | major |
| Changing a default that changes behaviour              | major |
| A new export, option, attribute or provider            | minor |
| A bug fix, a wording change, documentation             | patch |

The current line is 2.x. Only 2.x gets fixes; 1.x and 0.x do not. Tag `v1.0.0` is the state submitted
with the bachelor thesis and is identical to 1.0.1 on npm; it stays for reference.

A prerelease uses a hyphen (`v2.1.0-rc.1`) and is marked as a prerelease automatically.

## The release flow

1. Update `CHANGELOG.md`: rename `## Unreleased` to `## X.Y.Z (YYYY-MM-DD)` and add a fresh empty
   `## Unreleased` above it.
2. Set the same version in `package.json`.
3. Run `pnpm install && pnpm build`, then commit the rebuilt `dist/` as `release: vX.Y.Z`.
4. Tag and push:

   ```bash
   git tag vX.Y.Z
   git push && git push --tags
   ```

5. The tag triggers `.github/workflows/release.yml`.
6. Publish to npm from a local checkout of the tag:

   ```bash
   npm publish --provenance --access public
   ```

## What CI does

`.github/workflows/ci.yml` runs on every push and pull request, on Node 20 and 22: `pnpm lint`,
`pnpm format:check`, `pnpm typecheck`, `pnpm test`, `pnpm build`. A separate job fails a pull request
against `main` whose `dist/` is stale, because `dist/` is tracked for Composer installs. CI also
fails a tag whose name does not match the version in `package.json`.

`.github/workflows/release.yml` runs on a `v*` tag. It checks out the tag, runs lint, typecheck,
tests and the build, fails if `dist/` does not match the source, reads the matching CHANGELOG section
with `node scripts/changelog-section.mjs X.Y.Z`, and creates the GitHub release from it.

It does **not** publish to npm. That is deliberate: no npm token lives in this repository. The
workflow's last step prints the three commands for the manual publish.

## Publishing to npm

```bash
git checkout vX.Y.Z
pnpm install --frozen-lockfile && pnpm build
npm publish --provenance --access public
```

`files` in `package.json` limits the tarball to `dist/`, `README.md` and `LICENSE`. Check the
contents with `npm pack --dry-run` before publishing.

Composer needs nothing: `jdeffner/ai-form-fill` installs from the git repository, and `dist/` is
committed, so the tag is the release.

## Documentation deploys

- **The Pages site** (demo app and API reference) is built and deployed by
  `.github/workflows/pages.yml` on every push to `main`. It needs no secret; the workflow uses the
  built-in token with `pages: write` and `id-token: write`. The owner enables it once under
  **Settings** -> **Pages** -> **Build and deployment** -> **Source: GitHub Actions**.
- **The wiki** is not deployed by CI. After a pull request that touches `docs/wiki/` is merged, run:

  ```bash
  pnpm wiki:sync
  ```

  `scripts/sync-wiki.mjs` clones `https://github.com/JDeffner/ai-form-fill.wiki.git` into a temporary
  directory, replaces its Markdown files with `docs/wiki/*.md`, commits
  `docs: sync wiki from <sha>` and pushes. It does nothing when the content is unchanged, and it
  removes the temporary clone afterwards. It needs push access to the wiki repository, which is the
  same access as the code repository.

## Release checklist

- [ ] `## Unreleased` is empty and the new section is dated.
- [ ] `package.json` version matches the tag you are about to create.
- [ ] `pnpm lint && pnpm format:check && pnpm typecheck && pnpm test && pnpm build` passes.
- [ ] `git status` is clean, with the rebuilt `dist/` committed.
- [ ] The README and the wiki mention any new option, attribute or entry point.
- [ ] The tag is pushed and the GitHub release looks right.
- [ ] `npm publish` is done and the version shows up on npm.
- [ ] `pnpm wiki:sync` is run if `docs/wiki/` changed.
