import { useEffect, useId, useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ClearIcon } from '../../components/icons/ClearIcon';
/** Contains a focused child task; Escape never dismisses the parent dialog. */
export function ImportChild({
  title,
  description,
  wide = false,
  onClose,
  children,
}: {
  title: string;
  description?: string;
  wide?: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const descriptionId = useId();
  const { t } = useTranslation();
  useEffect(() => {
    const element = ref.current!;
    element.showModal();
    heading.current?.focus();
    return () => element.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className={`backup-dialog export-profile-picker import-child${wide ? ' import-child--wide' : ''}`}
      aria-label={title}
      aria-describedby={description ? descriptionId : undefined}
      onKeyDownCapture={(event) => {
        // A search input can consume Escape before the native dialog cancel event.
        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          onClose();
        }
      }}
      onCancel={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }}
    >
      <div className="backup-dialog__main">
        <header className="backup-dialog__header">
          <div>
            <h1 ref={heading} tabIndex={-1}>
              {title}
            </h1>
            {description ? (
              <p id={descriptionId} title={description}>
                {description}
              </p>
            ) : null}
          </div>
          <button
            className="backup-dialog__close"
            type="button"
            aria-label={t('import.closeChild')}
            onClick={onClose}
          >
            <ClearIcon />
          </button>
        </header>
        {children}
      </div>
    </dialog>
  );
}
