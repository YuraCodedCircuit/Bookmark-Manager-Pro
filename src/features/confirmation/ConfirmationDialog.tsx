import { useEffect, useRef } from 'react';
import { useStore } from 'zustand';

import type { ConfirmationService } from '../../application/confirmation/confirmation-service';

interface ConfirmationDialogProps {
  service: ConfirmationService;
}

/** Renders queued decisions in the browser top layer above all app windows. */
export function ConfirmationDialog({ service }: ConfirmationDialogProps) {
  const active = useStore(service.store, (state) => state.active);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !active) return;
    restoreFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    if (!dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    }
    cancelRef.current?.focus();
    return () => {
      if (dialog.open) {
        if (typeof dialog.close === 'function') dialog.close();
        else dialog.removeAttribute('open');
      }
      if (restoreFocusRef.current?.isConnected) restoreFocusRef.current.focus();
    };
  }, [active]);

  if (!active) return null;
  const titleId = `confirmation-title-${active.id}`;
  const descriptionId = `confirmation-description-${active.id}`;

  return (
    <dialog
      aria-describedby={descriptionId}
      aria-labelledby={titleId}
      className="confirmation-dialog"
      onCancel={(event) => {
        event.preventDefault();
        service.resolve(active.id, false);
      }}
      onKeyDown={(event) => {
        if (event.key !== 'Escape') return;
        event.preventDefault();
        event.stopPropagation();
        service.resolve(active.id, false);
      }}
      ref={dialogRef}
    >
      <div className="confirmation-dialog__content">
        <h2 id={titleId}>{active.title}</h2>
        <p id={descriptionId}>{active.message}</p>
      </div>
      <div className="confirmation-dialog__actions">
        <button
          className="secondary-button"
          onClick={() => service.resolve(active.id, false)}
          ref={cancelRef}
          type="button"
        >
          {active.cancelLabel}
        </button>
        <button
          className={`confirmation-dialog__confirm confirmation-dialog__confirm--${active.variant ?? 'primary'}`}
          onClick={() => service.resolve(active.id, true)}
          type="button"
        >
          {active.confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
