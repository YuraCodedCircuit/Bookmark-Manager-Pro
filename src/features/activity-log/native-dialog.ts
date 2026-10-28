/** Uses native modal behavior, retaining the existing DOM-test fallback. */
export function setLogDialogOpen(
  element: HTMLDialogElement | null,
  open: boolean,
): void {
  if (!element || element.open === open) return;
  if (open) {
    if (typeof element.showModal === 'function') element.showModal();
    else element.setAttribute('open', '');
  } else if (typeof element.close === 'function') element.close();
  else element.removeAttribute('open');
}
