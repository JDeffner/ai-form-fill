/**
 * Demo-only polish: flash a field the moment the library resolves it.
 *
 * The fill step dispatches synthetic `input` events on every written field;
 * synthetic events have `isTrusted === false`, which cleanly separates AI
 * fills from the user typing. Pure presentation — the library itself stays
 * unstyled.
 */
document.addEventListener('input', (event) => {
  if (event.isTrusted || !(event.target instanceof HTMLElement)) return;
  const field = event.target;
  field.classList.remove('aff-flash');
  void field.offsetWidth; // restart the animation if the field fills twice
  field.classList.add('aff-flash');
  field.addEventListener('animationend', () => field.classList.remove('aff-flash'), { once: true });
});
