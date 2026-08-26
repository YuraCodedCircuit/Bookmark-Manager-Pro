import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import faqMarkdown from '../../../FAQ.md?raw';
import { ClearIcon } from '../../components/icons/ClearIcon';
import { MarkdownContent } from '../../components/MarkdownContent';

interface HelpDialogProps {
  isOpen: boolean;
  onClose(): void;
  onOpenExternalLink(url: string): void;
}

/** Displays the bundled, offline product FAQ. */
export function HelpDialog({
  isOpen,
  onClose,
  onOpenExternalLink,
}: HelpDialogProps) {
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
      aria-labelledby="help-title"
      className="profile-window changelog-window help-window"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      ref={dialogRef}
    >
      <header className="profile-window__header">
        <div>
          <h1 id="help-title">{t('help.title')}</h1>
          <p>{t('help.description')}</p>
        </div>
        <button
          aria-label={t('help.close')}
          onClick={onClose}
          ref={closeButtonRef}
          type="button"
        >
          <ClearIcon />
        </button>
      </header>
      <article className="changelog-window__content">
        <MarkdownContent
          markdown={faqMarkdown}
          onOpenLink={onOpenExternalLink}
        />
      </article>
      <footer className="changelog-window__footer">
        <button onClick={onClose} type="button">
          {t('help.close')}
        </button>
      </footer>
    </dialog>
  );
}
