/** Schedules maintenance after both the caller's UI commit and the document load. */
export function scheduleAfterPageLoad(run: () => void): () => void {
  let timer: number | undefined;
  const schedule = () => {
    timer = window.setTimeout(run, 0);
  };
  if (document.readyState === 'complete') schedule();
  else window.addEventListener('load', schedule, { once: true });
  return () => {
    window.removeEventListener('load', schedule);
    if (timer !== undefined) window.clearTimeout(timer);
  };
}
