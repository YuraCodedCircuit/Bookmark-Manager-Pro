import { useEffect, useRef, type ReactNode, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';

import { ClearIcon } from '../../components/icons/ClearIcon';

interface Props {
  children: ReactNode;
  onClose(): void;
  returnFocusRef: RefObject<HTMLButtonElement | null>;
}

/** Places immediate history filters above the parent modal and restores its trigger focus. */
export function UndoHistoryFiltersDialog({
  children,
  onClose,
  returnFocusRef,
}: Props) {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const returnFocusTarget = returnFocusRef.current;
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
    dialog.querySelector('select')?.focus();
    return () => {
      if (typeof dialog.close === 'function') dialog.close();
      else dialog.removeAttribute('open');
      if (returnFocusTarget?.isConnected) returnFocusTarget.focus();
    };
  }, [returnFocusRef]);

  return (
    <dialog
      aria-labelledby="undo-history-filters-title"
      className="profile-window undo-history-filters"
      id="undo-history-options"
      onCancel={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          onClose();
        }
      }}
      ref={dialogRef}
    >
      <header className="profile-window__header">
        <h2 id="undo-history-filters-title">{t('undoHistory.filters')}</h2>
        <button
          aria-label={t('undoHistory.closeFilters')}
          onClick={onClose}
          type="button"
        >
          <ClearIcon />
        </button>
      </header>
      {children}
      <footer className="undo-history__footer undo-history-filters__footer">
        <button
          className="profile-button profile-button--primary"
          onClick={onClose}
          type="button"
        >
          {t('undoHistory.closeButton')}
        </button>
      </footer>
    </dialog>
  );
}
