import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import changelogMarkdown from '../../../CHANGELOG.md?raw';
import { ClearIcon } from '../../components/icons/ClearIcon';
import { MarkdownContent } from '../../components/MarkdownContent';

interface ChangelogDialogProps {
  content?:
    | { kind: 'full' }
    | { kind: 'version'; markdown: string }
    | { kind: 'unavailable' };
  isOpen: boolean;
  onAutomaticContentRendered?(): void;
  onClose(): void;
  onOpenExternalLink(url: string): void;
}

/** Displays the bundled user-facing changelog as safe rendered Markdown. */
export function ChangelogDialog({
  content = { kind: 'full' },
  isOpen,
  onAutomaticContentRendered,
  onClose,
  onOpenExternalLink,
}: ChangelogDialogProps) {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const renderedRef = useRef(false);
  const [showFullChangelog, setShowFullChangelog] = useState(false);

  const closeDialog = () => {
    renderedRef.current = false;
    setShowFullChangelog(false);
    onClose();
  };

  useEffect(() => {
    if (!isOpen) return;
    if (content.kind !== 'full' && !renderedRef.current) {
      renderedRef.current = true;
      onAutomaticContentRendered?.();
    }
  }, [content.kind, isOpen, onAutomaticContentRendered]);

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
        closeDialog();
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
          onClick={closeDialog}
          ref={closeButtonRef}
          type="button"
        >
          <ClearIcon />
        </button>
      </header>
      <article className="changelog-window__content">
        {content.kind === 'unavailable' && !showFullChangelog ? (
          <p>{t('changelog.unavailable')}</p>
        ) : (
          <MarkdownContent
            markdown={
              content.kind === 'version' ? content.markdown : changelogMarkdown
            }
            onOpenLink={onOpenExternalLink}
          />
        )}
      </article>
      <footer className="changelog-window__footer">
        {content.kind === 'unavailable' && !showFullChangelog ? (
          <button onClick={() => setShowFullChangelog(true)} type="button">
            {t('changelog.openFull')}
          </button>
        ) : null}
        <button onClick={closeDialog} type="button">
          {t('changelog.close')}
        </button>
      </footer>
    </dialog>
  );
}
