# Contributing

Thanks for your interest in improving `ai-form-fill`!

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

| Script                  | What it does                                            |
| ----------------------- | ------------------------------------------------------- |
| `pnpm dev`              | Start the Vite dev server with the demo pages           |
| `pnpm test`             | Run the unit tests once (no network needed)             |
| `pnpm test:watch`       | Run the unit tests in watch mode                        |
| `pnpm test:integration` | Run the Ollama integration suite (requires Ollama)      |
| `pnpm lint`             | ESLint over the whole repo                              |
| `pnpm lint:fix`         | ESLint with autofix                                     |
| `pnpm format`           | Prettier write                                          |
| `pnpm format:check`     | Prettier check (CI mode)                                |
| `pnpm typecheck`        | `tsc --noEmit`                                          |
| `pnpm build`            | Typecheck + build `dist/` (ESM, UMD, rolled-up `.d.ts`) |

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
styled with shadcn/ui; the generated components live in
`examples/components/ui/` and `components.json` configures the shadcn CLI
(`pnpm dlx shadcn@latest add <component>`). The `@/` alias points at
`examples/`. All of this is dev-only: the library build (`lib/`) has no
React, Tailwind or shadcn dependency.

Forms in the demos use native controls (`NativeSelect`, plain checkbox and
radio inputs) rather than the Radix-based shadcn `Select`/`Checkbox`/
`RadioGroup`: the library writes to native form controls, and a Radix widget
with a hidden mirror input would not update visually.

## Pull requests

- Keep PRs focused; renames/moves go in their own commit so diffs stay
  reviewable.
- Before pushing, run `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
  — CI runs exactly these.
- Public APIs carry TSDoc comments; the rolled-up `dist/*.d.ts` preserves them
  for consumers, so please document any new exported symbol.
- `dist/` is tracked in git (composer installs from the repo). Do not edit it
  by hand; it is rebuilt and committed on release.
