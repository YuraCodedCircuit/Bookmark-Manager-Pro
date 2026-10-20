import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { ProfileIdentityListItem } from '../../application/profile/profile-management-repository';
import { ClearableInput } from '../../components/ClearableInput';
import { ClearIcon } from '../../components/icons/ClearIcon';

interface Props {
  current: readonly ProfileIdentityListItem[];
  deleted: readonly (readonly [string, { name: string }])[];
  selectedId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}

/** Selects a snapshot profile locally without activating it or changing stored data. */
export function BackupProfilePicker({
  current,
  deleted,
  selectedId,
  onSelect,
  onClose,
}: Props) {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const filterRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  useEffect(() => {
    const dialog = dialogRef.current!;
    dialog.showModal();
    filterRef.current?.focus();
    return () => {
      dialog.close();
    };
  }, []);
  const match = (name: string) =>
    name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
  const groups = [
    {
      label: t('backup.currentProfiles'),
      rows: current
        .filter(({ profile }) => match(profile.username))
        .map(({ profile, isActive }) => ({
          id: profile.id,
          name: profile.username,
          active: isActive,
        })),
    },
    {
      label: t('backup.deletedProfiles'),
      rows: deleted
        .filter(([, item]) => match(item.name))
        .map(([id, item]) => ({ id, name: item.name, active: false })),
    },
  ];
  return (
    <dialog
      ref={dialogRef}
      className="backup-dialog backup-profile-picker"
      aria-labelledby="backup-profile-picker-title"
      onCancel={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }}
    >
      <header className="backup-dialog__header">
        <h2 id="backup-profile-picker-title">{t('backup.chooseProfile')}</h2>
        <button
          type="button"
          className="backup-dialog__close"
          aria-label={t('backup.closeProfilePicker')}
          onClick={onClose}
        >
          <ClearIcon />
        </button>
      </header>
      <div className="backup-profile-picker__filter">
        <label htmlFor="backup-profile-filter">
          {t('backup.filterProfiles')}
        </label>
        <ClearableInput
          id="backup-profile-filter"
          ref={filterRef}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      <div className="backup-profile-picker__list">
        {groups.map(({ label, rows }) =>
          rows.length ? (
            <section key={label} aria-label={label}>
              <h3>{label}</h3>
              <ul>
                {rows.map((row) => (
                  <li key={row.id}>
                    <button
                      type="button"
                      aria-pressed={selectedId === row.id}
                      onClick={() => onSelect(row.id)}
                    >
                      <span className="backup-profile-picker__name">
                        {row.name}
                      </span>
                      {row.active ? (
                        <span className="profile-status">
                          {t('profiles.active')}
                        </span>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null,
        )}
        {!groups.some(({ rows }) => rows.length) ? (
          <p role="status">{t('backup.noMatchingProfiles')}</p>
        ) : null}
      </div>
      <footer className="backup-dialog__footer">
        <button type="button" onClick={onClose}>
          {t('backup.close')}
        </button>
      </footer>
    </dialog>
  );
}
