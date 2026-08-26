import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { NavigationItem } from '../../application/bookmark/manage-bookmarks';
import { ClearIcon } from '../../components/icons/ClearIcon';
import { CopyIcon } from '../../components/icons/CopyIcon';
import { appearanceStyle } from '../../shared/appearance-style';
import { formatDateTime } from '../../shared/date-time-format';
import type { DateTimeFormatPreference } from '../../shared/date-time-format';

export type ItemInfoField =
  | 'appearance'
  | 'createdAt'
  | 'id'
  | 'note'
  | 'parent'
  | 'position'
  | 'tags'
  | 'title'
  | 'type'
  | 'updatedAt'
  | 'url';

interface ItemInfoDialogProps {
  item: NavigationItem;
  onClose: () => void;
  onCopy: (field: ItemInfoField, value: string) => Promise<void>;
  parentName: string;
  dateTimeFormat?: DateTimeFormatPreference;
}

/** Displays non-editable, validated item metadata in a compact modal window. */
export function ItemInfoDialog({
  item,
  onClose,
  onCopy,
  parentName,
  dateTimeFormat = 'browser',
}: ItemInfoDialogProps) {
  const { i18n, t } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [copiedField, setCopiedField] = useState<ItemInfoField>();
  const [copyError, setCopyError] = useState('');
  const value = item.value;
  const primaryRows = [
    {
      field: 'title' as const,
      label: t('itemInfo.titleRow'),
      value: value.title,
    },
    ...('url' in value
      ? [{ field: 'url' as const, label: t('itemInfo.url'), value: value.url }]
      : []),
  ];
  const technicalRows = [
    {
      field: 'type' as const,
      label: t('itemInfo.type'),
      value: t(`itemInfo.types.${item.kind}`),
    },
    {
      field: 'parent' as const,
      label: t('itemInfo.parentFolder'),
      value: parentName,
    },
    {
      field: 'createdAt' as const,
      label: t('itemInfo.created'),
      value: formatDateTime(
        value.createdAt,
        dateTimeFormat,
        i18n.resolvedLanguage ?? i18n.language,
      ),
    },
    {
      field: 'updatedAt' as const,
      label: t('itemInfo.edited'),
      value: formatDateTime(
        value.updatedAt,
        dateTimeFormat,
        i18n.resolvedLanguage ?? i18n.language,
      ),
    },
  ];
  const emptyValue = t('itemInfo.none');
  const moreRows = [
    { field: 'id' as const, label: t('itemInfo.id'), value: value.id },
    {
      field: 'tags' as const,
      label: t('itemInfo.tags'),
      value: value.tags.length > 0 ? value.tags.join(', ') : emptyValue,
    },
    {
      field: 'note' as const,
      label: t('itemInfo.note'),
      value: value.note.length > 0 ? value.note : emptyValue,
    },
    {
      field: 'position' as const,
      label: t('itemInfo.position'),
      value: String(value.index + 1),
    },
    {
      field: 'appearance' as const,
      label: t('itemInfo.appearanceType'),
      value: t(`itemInfo.appearanceTypes.${value.cardAppearance.kind}`),
    },
  ];

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    }
    closeButtonRef.current?.focus();
  }, []);

  const copy = async (field: ItemInfoField, rowValue: string) => {
    setCopyError('');
    try {
      await onCopy(field, rowValue);
      setCopiedField(field);
    } catch {
      setCopiedField(undefined);
      setCopyError(t('itemInfo.copyFailed'));
    }
  };

  const renderRows = (
    rows: typeof primaryRows | typeof technicalRows | typeof moreRows,
  ) =>
    rows.map((row) => (
      <div className="item-info-dialog__row" key={row.field}>
        <dt>{row.label}</dt>
        <dd>{row.value}</dd>
        <button
          aria-label={t('itemInfo.copyValue', { label: row.label })}
          onClick={() => void copy(row.field, row.value)}
          title={t('itemInfo.copyValue', { label: row.label })}
          type="button"
        >
          <CopyIcon />
        </button>
        <span aria-live="polite" className="visually-hidden">
          {copiedField === row.field ? t('itemInfo.copied') : ''}
        </span>
      </div>
    ));

  return (
    <dialog
      aria-labelledby="item-info-title"
      className="item-info-dialog"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
      ref={dialogRef}
    >
      <header className="item-info-dialog__header">
        <h1 id="item-info-title">{t('itemInfo.heading')}</h1>
        <button
          aria-label={t('itemInfo.close')}
          onClick={onClose}
          ref={closeButtonRef}
          type="button"
        >
          <ClearIcon />
        </button>
      </header>
      <div className="item-info-dialog__scroll-region">
        <div
          aria-label={t('itemInfo.appearance')}
          className="item-info-dialog__appearance"
          role="img"
          style={appearanceStyle(value.cardAppearance)}
        />
        <div className="item-info-dialog__content">
          <dl className="item-info-dialog__primary-rows">
            {renderRows(primaryRows)}
          </dl>
          <dl>{renderRows(technicalRows)}</dl>
          <details className="item-info-dialog__more">
            <summary>{t('itemInfo.moreDetails')}</summary>
            <dl>{renderRows(moreRows)}</dl>
          </details>
          {copyError ? (
            <p className="item-info-dialog__error" role="alert">
              {copyError}
            </p>
          ) : null}
        </div>
      </div>
    </dialog>
  );
}
