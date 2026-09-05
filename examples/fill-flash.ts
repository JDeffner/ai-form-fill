/**
 * Demo-only polish: flash a field the moment the library writes into it.
 *
 * `<ai-form-fill>` marks every field it writes with `data-aff-filled` for a
 * moment, and `styles.css` animates that attribute. The controller pages get
 * the same highlight from here: the library dispatches a bubbling
 * `aff:field-filled` event for every field, so one listener on the document
 * covers every page that does not use the element.
 */
import type { AFFEventMap } from '../lib/index';

/** Matches the window the custom element keeps the attribute for. */
const HIGHLIGHT_MS = 1500;

const timers = new WeakMap<HTMLElement, ReturnType<typeof setTimeout>>();

document.addEventListener('aff:field-filled', (event) => {
  // `document` is not an HTMLElement, so the library's HTMLElementEventMap
  // augmentation does not apply here; the cast recovers the detail type.
  const { element } = (event as CustomEvent<AFFEventMap['aff:field-filled']>).detail;
  clearTimeout(timers.get(element));

  element.removeAttribute('data-aff-filled');
  void element.offsetWidth; // restart the animation if the field fills twice
  element.setAttribute('data-aff-filled', '');

  timers.set(
    element,
    setTimeout(() => element.removeAttribute('data-aff-filled'), HIGHLIGHT_MS),
  );
});
