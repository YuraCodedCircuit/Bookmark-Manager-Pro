export type NotificationDiagnostic = 'top-layer-unavailable' | 'action-failed';

/** Reports renderer failures without notification content or recursive notices. */
export function reportNotificationDiagnostic(
  report: ((event: NotificationDiagnostic) => void) | undefined,
  event: NotificationDiagnostic,
): void {
  try {
    if (report) report(event);
    else if (event === 'top-layer-unavailable')
      console.warn('notification-top-layer-unavailable');
    else console.error('notification-action-failed');
  } catch {
    console.error('notification-diagnostic-failed');
  }
}

/**
 * Keeps one stable React portal in the last-opened modal and raises its manual
 * popover after other top-layer elements. Moving the DOM never owns a timer.
 */
export function mountNotificationLayer(
  container: HTMLElement,
  viewport: HTMLElement,
  report: () => void,
): () => void {
  const dialogs = [
    ...document.querySelectorAll<HTMLDialogElement>('dialog[open]'),
  ];
  const focusedDialog = document.activeElement?.closest('dialog[open]');
  if (
    focusedDialog instanceof HTMLDialogElement &&
    dialogs.includes(focusedDialog)
  ) {
    dialogs.splice(dialogs.indexOf(focusedDialog), 1);
    dialogs.push(focusedDialog);
  }
  let disposed = false;
  let scheduled = false;
  let shown = false;
  let degraded = false;
  const fallback = () => {
    viewport.removeAttribute('popover');
    if (!degraded) {
      degraded = true;
      report();
    }
  };
  const sync = () => {
    if (disposed) return;
    const notificationFocus = container.contains(document.activeElement)
      ? (document.activeElement as HTMLElement)
      : null;
    for (let index = dialogs.length - 1; index >= 0; index--) {
      if (!dialogs[index]!.isConnected || !dialogs[index]!.open)
        dialogs.splice(index, 1);
    }
    for (const dialog of document.querySelectorAll<HTMLDialogElement>(
      'dialog[open]',
    )) {
      if (!dialogs.includes(dialog)) dialogs.push(dialog);
    }
    const open = dialogs.filter((dialog) => dialog.isConnected && dialog.open);
    const modals = open.filter((dialog) => {
      try {
        return dialog.matches(':modal');
      } catch {
        return false;
      }
    });
    const host = modals.at(-1) ?? open.at(-1) ?? document.body;
    if (container.parentElement !== host) {
      const focused = container.contains(document.activeElement)
        ? (document.activeElement as HTMLElement)
        : null;
      const movingHost = host as HTMLElement & {
        moveBefore?: (node: Node, before: Node | null) => void;
      };
      if (
        container.isConnected &&
        typeof movingHost.moveBefore === 'function'
      ) {
        try {
          movingHost.moveBefore(container, null);
        } catch {
          host.append(container);
        }
      } else host.append(container);
      if (focused?.isConnected) focused.focus({ preventScroll: true });
    }
    if (!viewport.isConnected) return;
    if (
      typeof viewport.showPopover !== 'function' ||
      typeof viewport.hidePopover !== 'function'
    ) {
      fallback();
      return;
    }
    try {
      viewport.setAttribute('popover', 'manual');
      let open = shown;
      try {
        open = viewport.matches(':popover-open');
      } catch {
        /* Older DOM implementations use tracked state. */
      }
      if (open) viewport.hidePopover();
      viewport.showPopover();
      shown = true;
      if (
        notificationFocus?.isConnected &&
        document.activeElement !== notificationFocus
      )
        notificationFocus.focus({ preventScroll: true });
    } catch {
      fallback();
    }
  };
  const schedule = () => {
    if (scheduled || disposed) return;
    scheduled = true;
    queueMicrotask(() => {
      scheduled = false;
      sync();
    });
  };
  const onToggle = (event: Event) => {
    if (event.target === viewport || !(event.target instanceof HTMLElement))
      return;
    if (
      event.target instanceof HTMLDialogElement &&
      (event as ToggleEvent).newState === 'open'
    ) {
      const index = dialogs.indexOf(event.target);
      if (index >= 0) dialogs.splice(index, 1);
      dialogs.push(event.target);
    }
    schedule();
  };
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      if (
        record.attributeName === 'open' &&
        record.oldValue === null &&
        record.target instanceof HTMLDialogElement &&
        record.target.open
      ) {
        const index = dialogs.indexOf(record.target);
        if (index >= 0) dialogs.splice(index, 1);
        dialogs.push(record.target);
      }
    }
    if (
      records.some(
        (record) =>
          !container.contains(record.target) &&
          (record.type === 'attributes' ||
            [...record.addedNodes, ...record.removedNodes].some(
              (node) =>
                node instanceof Element &&
                (node.matches('dialog, [popover]') ||
                  node.querySelector('dialog, [popover]')),
            )),
      )
    )
      schedule();
  });
  observer.observe(document.body, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeOldValue: true,
    attributeFilter: ['open', 'popover'],
  });
  document.addEventListener('beforetoggle', onToggle, true);
  document.addEventListener('toggle', onToggle, true);
  sync();
  return () => {
    disposed = true;
    observer.disconnect();
    document.removeEventListener('beforetoggle', onToggle, true);
    document.removeEventListener('toggle', onToggle, true);
    if (shown && viewport.isConnected) {
      try {
        viewport.hidePopover();
      } catch {
        fallback();
      }
    }
    container.remove();
  };
}
