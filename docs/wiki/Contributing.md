# Contributing

This page covers the local setup, the scripts, the test layout and the pull request rules. It
mirrors `CONTRIBUTING.md` in the repository.

Bug reports, feature requests and pull requests are all welcome. The
[code of conduct](https://github.com/JDeffner/ai-form-fill/blob/main/CODE_OF_CONDUCT.md) applies to
every space of this project. Security problems go through
[the security policy](https://github.com/JDeffner/ai-form-fill/security/advisories/new), not through
a public issue.

## Setup

1. Install [Node.js](https://nodejs.org) 20 or newer and [pnpm](https://pnpm.io/installation).
2. Clone the repository and run `pnpm install`.
3. Optional, only for the integration tests and the local demo: install [Ollama](https://ollama.com)
   and pull the default model.

   ```bash
   ollama pull gemma3:4b
   ```

4. Optional, only for the cloud provider demos: copy `.env.example` to `.env` and fill in the keys
   you have. `.env` is gitignored.

## Scripts

| Script                  | What it does                                                  |
| ----------------------- | ------------------------------------------------------------- |
| `pnpm dev`              | Vite dev server with the demo pages                           |
| `pnpm test`             | Unit tests once, no network needed                            |
| `pnpm test:watch`       | Unit tests in watch mode                                      |
| `pnpm test:integration` | The Ollama integration suite, needs a running Ollama          |
| `pnpm lint`             | ESLint over the whole repository                              |
| `pnpm lint:fix`         | ESLint with autofix                                           |
| `pnpm format`           | Prettier write                                                |
| `pnpm format:check`     | Prettier check, the CI mode                                   |
| `pnpm typecheck`        | `tsc --noEmit`                                                |
| `pnpm build`            | Typecheck and build `dist/` (ESM, CJS, rolled-up `.d.ts`)     |
| `pnpm build:site`       | Build the docs site into `site/` (demo app and API reference) |
| `pnpm wiki:sync`        | Push `docs/wiki/` to the GitHub wiki (maintainers)            |

The build has one entry per public import path: `lib/index.ts` becomes `dist/ai-form-fill.*` and
`lib/voice/index.ts` becomes `dist/voice.*`. Add an entry in `vite.config.js` and an `exports` key in
`package.json` for every new one.

## Tests

- Unit tests live in `tests/` and run in a jsdom environment, so no local setup is required.
  `document` and the DOM element classes are globals; reset state with `document.body.innerHTML = ''`
  in a `beforeEach` if your test touches the DOM.
- The files in `tests/requirements/` trace to thesis requirements (FR-01 to FR-11). Keep the `FR-XX`
  prefix in the file names, and update the tests when the API changes, but do not delete them.
- `tests/integration/ollama.integration.test.ts` talks to a real Ollama at
  `http://localhost:11434` and **fails**, rather than skipping, when Ollama is unreachable. Run it
  explicitly with `pnpm test:integration`.

## Demo app

`examples/` is a small React app with hash-routed pages in `examples/pages/`, styled with shadcn/ui.
The pages are Element, Controller, Voice, React hook, Advanced and Script tag. The last one links to
`examples/vanilla.html`, which is static, loads the built script-tag bundle by relative path and
imports nothing from `lib/`, so run `pnpm build` once before opening it. `examples/snippets/` holds
the Vue and Svelte snippets.

The generated shadcn components live in `examples/components/ui/`, `components.json` configures the
shadcn CLI (`pnpm dlx shadcn@latest add <component>`), and the `@/` alias points at `examples/`. All
of this is dev-only: the library build has no Tailwind or shadcn dependency, and the only entry that
touches React is `lib/react/`, where `react` is an optional peer dependency left external.

Forms in the demos use native controls (`NativeSelect`, plain checkbox and radio inputs) rather than
the Radix-based shadcn `Select`, `Checkbox` and `RadioGroup`: the library writes to native form
controls, and a Radix widget with a hidden mirror input would not update visually.

## Documentation

- **The wiki** is authored in the repository, under `docs/wiki/`. Edit the page files there and open
  a pull request like any other change; do not edit the pages in the GitHub wiki UI, because the next
  sync overwrites them. After the pull request is merged, a maintainer runs `pnpm wiki:sync`, which
  copies `docs/wiki/*.md` into the wiki repository and pushes it. File names become page titles, so
  `Getting-Started.md` is the page "Getting Started" and links between pages are
  `[Getting Started](Getting-Started)`. `_Sidebar.md` and `_Footer.md` are the wiki's navigation.
- **The API reference** is generated from the TSDoc comments by `pnpm build:site`. Public symbols
  carry TSDoc, and the rolled-up `dist/*.d.ts` preserves it for consumers, so document every new
  exported symbol.
- **The README** stays the short overview; the long guides belong in the wiki.

## Docs site

`pnpm build:site` builds what GitHub Pages serves at https://jdeffner.github.io/ai-form-fill/ into
`site/`, which is gitignored:

1. `vite build -c vite.site.config.js` builds the demo app with the base path `/ai-form-fill/`. The
   app is hash-routed, so it needs no rewrite rules.
2. `node scripts/build-site.mjs` copies `examples/vanilla.html` and the built
   `dist/ai-form-fill.browser.js` into `site/examples/`. The page loads the bundle by relative path,
   so the pair works under any base path.
3. `typedoc` generates the API reference from the four entry points into `site/api`, which the "Docs"
   link in the demo header points at. In `pnpm dev` that link 404s until you have run
   `pnpm build:site` once.

`.github/workflows/pages.yml` runs this on every push to `main` and deploys the result.

## Pull requests

- Keep pull requests focused. Renames and moves go in their own commit so diffs stay reviewable.
- Before pushing, run
  `pnpm lint && pnpm format:check && pnpm typecheck && pnpm test && pnpm build`. CI runs exactly
  these, on Node 20 and 22.
- Add a line under `## Unreleased` in `CHANGELOG.md` for anything a user would notice.
- Public APIs carry TSDoc comments, so please document any new exported symbol.
- `dist/` is tracked in git, because Composer installs from the repository. Do not edit it by hand,
  but do commit the rebuilt output when you change `lib/`: CI fails a pull request against `main`
  whose `dist/` is stale.

The layout of the source and the invariants a change has to keep are in [Architecture](Architecture).
