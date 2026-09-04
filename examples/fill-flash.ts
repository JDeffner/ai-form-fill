/**
 * Demo-only polish: flash a field the moment the library writes into it.
 *
 * The library dispatches an `aff:field-filled` event for every field it fills;
 * the event bubbles, so one listener on the document covers every demo page.
 */
import type { AFFEventMap } from '../lib/index';

document.addEventListener('aff:field-filled', (event) => {
  // `document` is not an HTMLElement, so the library's HTMLElementEventMap
  // augmentation does not apply here; the cast recovers the detail type.
  const { element } = (event as CustomEvent<AFFEventMap['aff:field-filled']>).detail;
  element.classList.remove('aff-flash');
  void element.offsetWidth; // restart the animation if the field fills twice
  element.classList.add('aff-flash');
  element.addEventListener('animationend', () => element.classList.remove('aff-flash'), {
    once: true,
  });
});
