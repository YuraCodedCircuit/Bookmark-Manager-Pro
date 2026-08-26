import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import changelogMarkdown from '../../../CHANGELOG.md?raw';
import { ClearIcon } from '../../components/icons/ClearIcon';
import { MarkdownContent } from '../../components/MarkdownContent';

interface ChangelogDialogProps {
  isOpen: boolean;
  onClose(): void;
}

/** Displays the bundled user-facing changelog as safe rendered Markdown. */
export function ChangelogDialog({ isOpen, onClose }: ChangelogDialogProps) {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
      closeButtonRef.current?.focus();
    } else if (!isOpen && dialog.open) {
      if (typeof dialog.close === 'function') dialog.close();
      else dialog.removeAttribute('open');
    }
  }, [isOpen]);

  return (
    <dialog
      aria-labelledby="changelog-title"
      className="profile-window changelog-window"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      ref={dialogRef}
    >
      <header className="profile-window__header">
        <div>
          <h1 id="changelog-title">{t('changelog.title')}</h1>
          <p>{t('changelog.description')}</p>
        </div>
        <button
          aria-label={t('changelog.close')}
          onClick={onClose}
          ref={closeButtonRef}
          type="button"
        >
          <ClearIcon />
        </button>
      </header>
      <article className="changelog-window__content">
        <MarkdownContent markdown={changelogMarkdown} />
      </article>
      <footer className="changelog-window__footer">
        <button onClick={onClose} type="button">
          {t('changelog.close')}
        </button>
      </footer>
    </dialog>
  );
}
