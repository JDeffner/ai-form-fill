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
Hard 1.5px ink rules as structure (`--rule-w`), ~3px radius, no soft shadows.
The hard offset shadow is the landing demo cards only; in-form buttons are
deliberately flat so a row of them sits on an even baseline.

**Controls:** every single-line control (text, email, tel, number, date, time,
select) is pinned to one height, `--control-h`. Without it a text input, a
select and a time input render 40/42/43px and a form row goes visibly ragged,
because their intrinsic content boxes differ. Textareas are excluded; they
size to `rows`.

Checkboxes and radios are **drawn, not native**: `appearance: none` plus the
same ink rule and vermilion fill as everything else, sized by `--tick`, with
the checkmark as a clipped square and the radio dot as a circle. `accent-color`
alone is not enough, it recolors the tick but leaves the operating system's own
box, which is the one place the OS shows through an otherwise fully drawn page.
Selects likewise drop native chrome for a drawn ink chevron.

Bare-element button fallbacks (`button[type='submit']`, `input[type='reset']`)
are wrapped in `:where()` so they carry zero specificity. Unwrapped,
`button[type='submit']` outranks the `.btn-secondary` class and every secondary
submit button in a form silently renders vermilion.

**Signature device:** monospace bracket-index labels (`[01]`,
`[ SELECT A DEMO ]`) and an exposed ruled grid. Repeat it; keep everything
else quiet. Numerals stand in for icons.

**Texture:** the sheet itself carries a faint drafting grid (on `html`) and
an SVG noise grain overlay (`body::after`) so pages read as printed stock,
not flat screen. Both are near-invisible; resist turning them up.

**Motion:** entrance choreography only — page blocks rise in reading order
(`rise` keyframe, staggered delays), demo cards continue the stagger, log
entries and status lines rise as they appear. Fields flash vermilion as the
AI resolves them (`.aff-flash`, applied by `utils/enhance.ts` on synthetic
`input` events). Page-to-page navigation cross-fades via CSS view
transitions. Everything animates `transform`/`opacity` only and collapses
under `prefers-reduced-motion`.

**Consistency rules:**

- Every page links `/examples/styles.css` and the shared font `<link>`.
- Every page carries the same `.site-nav` (brand + Basic / Advanced / Voice /
  React), with the current page marked `aria-current="page"`.
- Every page header is `eyebrow (mono) → h1 (Fraunces) → subtitle`.
- Class names are shared and referenced by the demo JS (`.panel`, `.status`,
  `.log-entry`, `.btn-primary`, …) — restyle them, don't rename them.
