/**
 * Demo-only polish: flash a field the moment the library writes into it.
 *
 * The library dispatches synthetic `input` events on every field it fills.
 * Synthetic events have `isTrusted === false`, which separates AI fills from
 * the user typing.
 */
document.addEventListener('input', (event) => {
  if (event.isTrusted || !(event.target instanceof HTMLElement)) return;
  const field = event.target;
  field.classList.remove('aff-flash');
  void field.offsetWidth; // restart the animation if the field fills twice
  field.classList.add('aff-flash');
  field.addEventListener('animationend', () => field.classList.remove('aff-flash'), { once: true });
});
