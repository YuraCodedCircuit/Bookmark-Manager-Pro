import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import gplMarkdown from '../../../LICENSE.md?raw';
import privacyMarkdown from '../../../PRIVACY_POLICY.md?raw';
import termsMarkdown from '../../../TERMS_OF_USE.md?raw';
import thirdPartyLicensesMarkdown from '../../../THIRD_PARTY_LICENSES.md?raw';
import { ClearIcon } from '../../components/icons/ClearIcon';
import { MarkdownContent } from '../../components/MarkdownContent';

interface LegalDialogProps {
  isOpen: boolean;
  onClose(): void;
}

type LegalDocument = 'privacy' | 'terms' | 'appLicense' | 'thirdPartyLicenses';

const documents: Record<LegalDocument, string> = {
  appLicense: gplMarkdown,
  privacy: privacyMarkdown,
  terms: termsMarkdown,
  thirdPartyLicenses: thirdPartyLicensesMarkdown,
};

/** Presents the four bundled legal documents without network access. */
export function LegalDialog({ isOpen, onClose }: LegalDialogProps) {
  const { t } = useTranslation();
  const [selectedDocument, setSelectedDocument] =
    useState<LegalDocument>('privacy');
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) {
      setSelectedDocument('privacy');
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
      closeButtonRef.current?.focus();
    } else if (!isOpen && dialog.open) {
      if (typeof dialog.close === 'function') dialog.close();
      else dialog.removeAttribute('open');
    }
  }, [isOpen]);

  const selectDocument = (document: LegalDocument) => {
    setSelectedDocument(document);
    if (contentRef.current) contentRef.current.scrollTop = 0;
  };

  return (
    <dialog
      aria-labelledby="legal-title"
      className="profile-window changelog-window legal-window"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      ref={dialogRef}
    >
      <header className="profile-window__header">
        <div>
          <h1 id="legal-title">{t('legal.title')}</h1>
          <p>{t('legal.description')}</p>
        </div>
        <button
          aria-label={t('legal.close')}
          onClick={onClose}
          ref={closeButtonRef}
          type="button"
        >
          <ClearIcon />
        </button>
      </header>
      <nav aria-label={t('legal.documents')} className="legal-window__tabs">
        {(
          ['privacy', 'terms', 'appLicense', 'thirdPartyLicenses'] as const
        ).map((document) => (
          <button
            aria-current={selectedDocument === document ? 'page' : undefined}
            key={document}
            onClick={() => selectDocument(document)}
            type="button"
          >
            {t(`legal.${document}`)}
          </button>
        ))}
      </nav>
      <article className="changelog-window__content" ref={contentRef}>
        <MarkdownContent markdown={documents[selectedDocument]} />
      </article>
      <footer className="changelog-window__footer">
        <button onClick={onClose} type="button">
          {t('legal.close')}
        </button>
      </footer>
    </dialog>
  );
}
