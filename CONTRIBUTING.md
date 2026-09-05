# Contributing

Thanks for your interest in improving `ai-form-fill`. Bug reports, feature
requests and pull requests are all welcome. [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)
applies to every space of this project. Security problems go through
[SECURITY.md](SECURITY.md), not through a public issue.

## Setup

1. Install [Node.js](https://nodejs.org) >= 20 and [pnpm](https://pnpm.io/installation).
2. Clone the repo and run `pnpm install`.
3. Optional (only needed for the integration tests and the local demo):
   install [Ollama](https://ollama.com) and pull the default model:

   ```bash
   ollama pull gemma3:4b
   ```

4. Optional (only needed for the cloud-provider demos): copy `.env.example`
   to `.env` and fill in the API keys you have. `.env` is gitignored.

## Scripts

| Script                  | What it does                                                |
| ----------------------- | ----------------------------------------------------------- |
| `pnpm dev`              | Start the Vite dev server with the demo pages               |
| `pnpm test`             | Run the unit tests once (no network needed)                 |
| `pnpm test:watch`       | Run the unit tests in watch mode                            |
| `pnpm test:integration` | Run the Ollama integration suite (requires Ollama)          |
| `pnpm lint`             | ESLint over the whole repo                                  |
| `pnpm lint:fix`         | ESLint with autofix                                         |
| `pnpm format`           | Prettier write                                              |
| `pnpm format:check`     | Prettier check (CI mode)                                    |
| `pnpm typecheck`        | `tsc --noEmit`                                              |
| `pnpm build`            | Typecheck + build `dist/` (ESM, CJS, rolled-up `.d.ts`)     |
| `pnpm build:site`       | Build the docs site into `site/` (demo app + API reference) |
| `pnpm wiki:sync`        | Push `docs/wiki/` to the GitHub wiki (maintainers only)     |

The build has one entry per public import path: `lib/index.ts` becomes
`dist/ai-form-fill.*` (imported as `ai-form-fill`) and `lib/voice/index.ts`
becomes `dist/voice.*` (imported as `ai-form-fill/voice`). Add an entry in
`vite.config.js` and an `exports` key in `package.json` for every new one.

## Tests

- Unit tests live in `tests/` and run in a jsdom environment — no local setup
  required. `document` and the DOM element classes are available as globals;
  reset state with `document.body.innerHTML = ''` in a `beforeEach` if your
  test touches the DOM.
- The files in `tests/requirements/` trace to thesis requirements
  (FR-01…FR-11). Keep the `FR-XX` prefix in the file names; update the tests
  when the API changes, but do not delete them.
- `tests/integration/ollama.integration.test.ts` talks to a real Ollama
  instance at `http://localhost:11434` and **fails** (does not skip) when
  Ollama is unreachable. Run it explicitly with `pnpm test:integration`.

## Demo app

`examples/` is a small React app (hash-routed pages in `examples/pages/`)
styled with shadcn/ui. The pages are Element (`<ai-form-fill>` inside React),
Controller (headless `createFormFill`), Voice, React hook (`useFormFill`),
Advanced (provider switching and the `aff:*` event log) and Script tag, which
links to `examples/vanilla.html`. That page is static, loads the built
script-tag bundle by relative path and imports nothing from `lib/`, so run
`pnpm build` once before opening it. `examples/snippets/` holds the Vue and
Svelte snippets. The generated shadcn components live in
`examples/components/ui/` and `components.json` configures the shadcn CLI
(`pnpm dlx shadcn@latest add <component>`). The `@/` alias points at
`examples/`. All of this is dev-only: the library build (`lib/`) has no
Tailwind or shadcn dependency, and the only entry that touches React is
`lib/react/`, where `react` is an optional peer dependency left external.

Forms in the demos use native controls (`NativeSelect`, plain checkbox and
radio inputs) rather than the Radix-based shadcn `Select`/`Checkbox`/
`RadioGroup`: the library writes to native form controls, and a Radix widget
with a hidden mirror input would not update visually.

## Wiki

The [wiki](https://github.com/JDeffner/ai-form-fill/wiki) is authored in this repository, under
`docs/wiki/`. Edit the page files there and open a pull request like any other change; do not edit
the pages in the GitHub wiki UI, because the next sync overwrites them. After the pull request is
merged, a maintainer runs `pnpm wiki:sync`, which clones the wiki repository, replaces its Markdown
with `docs/wiki/*.md` and pushes. File names become page titles, so `Getting-Started.md` is the page
"Getting Started" and links between pages are `[Getting Started](Getting-Started)`. `_Sidebar.md` and
`_Footer.md` are the wiki's navigation.

## Docs site

`pnpm build:site` builds what GitHub Pages serves at
https://jdeffner.github.io/ai-form-fill/ into `site/`, which is gitignored:

1. `vite build -c vite.site.config.js` builds the demo app with the base path
   `/ai-form-fill/`. The app is hash-routed, so it needs no rewrite rules.
2. `node scripts/build-site.mjs` copies `examples/vanilla.html` and the built
   `dist/ai-form-fill.browser.js` into `site/examples/`. The page loads the
   bundle by relative path, so the pair works under any base path. In the dev
   server that same URL is served from `dist/` by a small plugin in
   `vite.config.js`, so run `pnpm build` once before opening the page.
3. `typedoc` generates the API reference from the four entry points into
   `site/api`, which the "Docs" link in the demo header points at. In
   `pnpm dev` that link 404s until you have run `pnpm build:site`.

`.github/workflows/pages.yml` runs this on every push to `main` and deploys the
result. The owner enables it once: repository **Settings** → **Pages** →
**Build and deployment** → **Source: GitHub Actions**. No secret is needed; the
workflow uses the built-in token with `pages: write` and `id-token: write`.

GitHub Discussions is off. If it gets enabled (**Settings** → **General** →
**Features** → **Discussions**), point the first contact link in
`.github/ISSUE_TEMPLATE/config.yml` at it.

## Releasing

Only the owner releases. npm publishing is deliberately not in CI, so no npm
token lives in this repository.

1. Update `CHANGELOG.md`: rename `## Unreleased` to `## X.Y.Z (YYYY-MM-DD)` and
   add a fresh empty `## Unreleased` above it.
2. Set the same version in `package.json`.
3. `pnpm install && pnpm build`, then commit the rebuilt `dist/` as
   `release: vX.Y.Z`.
4. `git tag vX.Y.Z` and `git push && git push --tags`.
5. The tag triggers `.github/workflows/release.yml`: it runs lint, typecheck,
   tests and the build, fails if `dist/` is stale, reads the CHANGELOG section
   with `node scripts/changelog-section.mjs X.Y.Z`, and creates the GitHub
   release from it. A tag with a hyphen (`v2.1.0-rc.1`) is marked as a
   prerelease. CI separately fails a tag whose name does not match
   `package.json`.
6. Publish from a local checkout of the tag:

   ```bash
   npm publish --provenance --access public
   ```

## Pull requests

- Keep PRs focused; renames/moves go in their own commit so diffs stay
  reviewable.
- Before pushing, run
  `pnpm lint && pnpm format:check && pnpm typecheck && pnpm test && pnpm build`.
  CI runs exactly these, on Node 20 and 22.
- Add a line under `## Unreleased` in `CHANGELOG.md` for anything a user would
  notice.
- Public APIs carry TSDoc comments; the rolled-up `dist/*.d.ts` preserves them
  for consumers, so please document any new exported symbol.
- `dist/` is tracked in git (composer installs from the repo). Do not edit it
  by hand, but do commit the rebuilt output when you change `lib/`: CI fails a
  PR against `main` whose `dist/` is stale.
