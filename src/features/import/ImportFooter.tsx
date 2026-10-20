import type { ReactNode } from 'react';

/** Keeps selection guidance above the footer's current selection and actions. */
export function ImportFooter({
  explanation,
  children,
}: {
  explanation?: string;
  children: ReactNode;
}) {
  return (
    <footer className="backup-dialog__footer import-selection-footer">
      {explanation ? (
        <p className="export-dialog__hint">{explanation}</p>
      ) : null}
      <div className="import-selection-footer__actions">{children}</div>
    </footer>
  );
}
