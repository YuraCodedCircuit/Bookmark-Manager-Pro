import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import packageMetadata from '../../../package.json';
import { getBrowserTarget } from '../../platform/browser/browser-target';

interface AboutDialogProps {
  isOpen: boolean;
  onClose(): void;
}

/** Presents non-sensitive application and release information. */
export function AboutDialog({ isOpen, onClose }: AboutDialogProps) {
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
      aria-labelledby="about-title"
      className="profile-window about-window"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      ref={dialogRef}
    >
      <div className="about-window__body">
        <div className="about-window__icon-frame">
          <img alt="" src="/app-icon.png" />
        </div>
        <div className="about-window__intro">
          <h1 id="about-title">{t('about.title')}</h1>
          <p>{t('about.description')}</p>
        </div>
        <dl className="about-window__details">
          <div>
            <dt>{t('about.version')}</dt>
            <dd>{packageMetadata.version}</dd>
          </div>
          <div>
            <dt>{t('about.browserTarget')}</dt>
            <dd>{getBrowserTarget(window.navigator.userAgent)}</dd>
          </div>
          <div>
            <dt>{t('about.releaseStatus')}</dt>
            <dd>{t('about.alpha')}</dd>
          </div>
        </dl>
        <p className="about-window__storage">{t('about.localStorage')}</p>
      </div>
      <footer className="about-window__footer">
        <p>{t('about.madeWith')}</p>
        <button
          className="about-window__close"
          onClick={onClose}
          ref={closeButtonRef}
          type="button"
        >
          {t('about.close')}
        </button>
      </footer>
    </dialog>
  );
}
