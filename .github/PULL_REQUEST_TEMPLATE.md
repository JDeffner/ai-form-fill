## What

<!-- What does this PR change, in one or two sentences? -->

## Why

<!-- Motivation, or the issue this closes. -->

## Checklist

- [ ] `pnpm lint && pnpm format:check && pnpm typecheck && pnpm test && pnpm build` passes locally
- [ ] Tests updated or added (requirement tests in `tests/requirements/` keep their `FR-XX` prefix)
- [ ] New or changed public APIs have TSDoc comments
- [ ] README and docs updated if behaviour or API changed
- [ ] A line added under `## Unreleased` in `CHANGELOG.md`
- [ ] If `lib/` changed: `pnpm build` was run and the resulting `dist/` is committed
