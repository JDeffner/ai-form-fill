# Examples — design system

The demo pages share one point of view and one stylesheet
(`examples/styles.css`). Keep new pages consistent with this brief.

**Point of view:** _Paste the mess — watch it resolve into fields._ The library
turns unstructured prose into structured form data; the pages should feel like
a precise instrument for that transformation, not a generic dashboard.

**Aesthetic:** Swiss technical / editorial instrument. Reference: an
Olivetti-era spec sheet crossed with a developer changelog.

**Type:**

- Display — **Fraunces** (serif, optical sizing) for page titles.
- Body/UI — **IBM Plex Sans**.
- Labels/tags/nav/buttons/code — **IBM Plex Mono**.
  Loaded from Google Fonts with `display=swap`; robust serif/sans/mono
  fallbacks so the pages still read intentionally offline.

**Palette (OKLCH tokens in `:root`):** warm paper background, near-black warm
ink, one reserved **vermilion** accent for interactive/important elements.
Hard 1.5px ink rules as structure, ~3px radius, no soft shadows (buttons and
demo cards use a hard offset shadow instead).

**Signature device:** monospace bracket-index labels (`[01]`,
`[ SELECT A DEMO ]`) and an exposed ruled grid. Repeat it; keep everything
else quiet. Numerals stand in for icons.

**Consistency rules:**

- Every page links `/examples/styles.css` and the shared font `<link>`.
- Every page carries the same `.site-nav` (brand + Basic / Advanced / Voice /
  React), with the current page marked `aria-current="page"`.
- Every page header is `eyebrow (mono) → h1 (Fraunces) → subtitle`.
- Class names are shared and referenced by the demo JS (`.panel`, `.status`,
  `.log-entry`, `.btn-primary`, …) — restyle them, don't rename them.
