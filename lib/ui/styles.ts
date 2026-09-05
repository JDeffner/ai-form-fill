/**
 * The stylesheet of the `<ai-form-fill>` element, as a string.
 *
 * It is injected into the element's shadow root only, never into the page.
 * The design is deliberately quiet: it inherits the page font and text colour
 * and reads on light and dark backgrounds without configuration. Integrators
 * retune it with the `--aff-*` custom properties or restyle any node through
 * its `part` name.
 */
export const ELEMENT_CSS = `
:host {
  --aff-accent: #1d4ed8;
  --aff-accent-fg: #fff;
  --aff-border: color-mix(in srgb, currentColor 22%, transparent);
  --aff-muted: color-mix(in srgb, currentColor 65%, transparent);
  --aff-radius: 8px;
  --aff-gap: 8px;
  --aff-font: inherit;
  display: block;
}
[hidden] { display: none !important; }
[part="panel"] {
  display: grid;
  gap: var(--aff-gap);
  padding: 12px;
  border: 1px solid var(--aff-border);
  border-radius: var(--aff-radius);
  font: var(--aff-font);
}
[part="label"] { font-size: .875em; }
[part="textarea"] {
  width: 100%;
  box-sizing: border-box;
  padding: 8px 10px;
  border: 1px solid var(--aff-border);
  border-radius: var(--aff-radius);
  background: transparent;
  color: inherit;
  font: inherit;
  resize: vertical;
}
[part="actions"] { display: flex; flex-wrap: wrap; gap: var(--aff-gap); }
button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 32px;
  padding: 0 12px;
  border: 1px solid var(--aff-border);
  border-radius: var(--aff-radius);
  background: transparent;
  color: inherit;
  font: inherit;
  cursor: pointer;
}
button:disabled { opacity: .5; cursor: default; }
[part="submit"], [part="apply"] {
  background: var(--aff-accent);
  border-color: var(--aff-accent);
  color: var(--aff-accent-fg);
}
[part="mic"][aria-pressed="true"] { border-color: var(--aff-accent); color: var(--aff-accent); }
[part="mic"] svg { width: 14px; height: 14px; }
[part="status"] { margin: 0; font-size: .875em; color: var(--aff-muted); }
[data-state="error"] [part="status"] { color: #b91c1c; }
[part="summary"] { display: grid; gap: 4px; font-size: .875em; }
[part="review-row"] { display: flex; align-items: center; gap: 6px; }
[part="review-value"] { color: var(--aff-muted); }
:focus-visible { outline: 2px solid var(--aff-accent); outline-offset: 2px; }
`;
