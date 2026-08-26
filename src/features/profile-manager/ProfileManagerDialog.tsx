import {
  type ChangeEvent,
  type FormEvent,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import type { ManagedProfileInput } from '../../application/profile/manage-profiles';
import type { ProfileListItem } from '../../application/profile/profile-management-repository';
import type { ProfilePreferences } from '../../domain/profile-settings';
import { ClearIcon } from '../../components/icons/ClearIcon';
import { ProfileAvatar } from './ProfileAvatar';
import { formatDateTime } from '../../shared/date-time-format';
import type { DateTimeFormatPreference } from '../../shared/date-time-format';

interface Props {
  confirmDeletion?: boolean;
  defaultProfileIcon?: ProfilePreferences['defaultProfileIcon'];
  isOpen: boolean;
  language: string;
  profiles: readonly ProfileListItem[];
  onClose(): void;
  onCreate(input: ManagedProfileInput): Promise<void>;
  onDelete(profileId: string): Promise<void>;
  onDuplicate(profileId: string): Promise<void>;
  onUpdate(profileId: string, input: ManagedProfileInput): Promise<void>;
  dateTimeFormat?: DateTimeFormatPreference;
}

/** Provides create/edit controls above the durable profile list. */
export function ProfileManagerDialog({
  confirmDeletion = true,
  defaultProfileIcon = 'built-in',
  isOpen,
  language,
  profiles,
  onClose,
  onCreate,
  onDelete,
  onDuplicate,
  onUpdate,
  dateTimeFormat = 'browser',
}: Props) {
  const { t, i18n } = useTranslation();
  const ref = useRef<HTMLDialogElement>(null);
  const [editingId, setEditingId] = useState<string>();
  const [username, setUsername] = useState('');
  const [icon, setIcon] = useState<string>();
  const [error, setError] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState<string>();
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    }
    if (!isOpen && dialog.open) {
      if (typeof dialog.close === 'function') dialog.close();
      else dialog.removeAttribute('open');
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflowY = document.documentElement.style.overflowY;
    document.documentElement.style.overflowY = 'hidden';
    return () => {
      document.documentElement.style.overflowY = previousOverflowY;
    };
  }, [isOpen]);

  const reset = () => {
    setEditingId(undefined);
    setUsername('');
    setIcon(undefined);
    setError('');
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const input = { username, icon, language };
      if (editingId) await onUpdate(editingId, input);
      else await onCreate(input);
      reset();
    } catch {
      setError(t('profiles.saveError'));
    }
  };
  const chooseIcon = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (
      file.size > 1_000_000 ||
      !['image/png', 'image/jpeg', 'image/bmp'].includes(file.type)
    ) {
      setError(t('profiles.iconError'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () =>
      setIcon(typeof reader.result === 'string' ? reader.result : undefined);
    reader.onerror = () => setError(t('profiles.iconError'));
    reader.readAsDataURL(file);
  };

  return (
    <dialog
      aria-labelledby="manage-profiles-title"
      className="profile-window profile-manager"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      ref={ref}
    >
      <header className="profile-window__header">
        <div>
          <h1 id="manage-profiles-title">{t('profiles.manageTitle')}</h1>
          <p>{t('profiles.manageSummary')}</p>
        </div>
        <button
          aria-label={t('profiles.close')}
          onClick={onClose}
          type="button"
        >
          <ClearIcon />
        </button>
      </header>
      <form className="profile-editor" onSubmit={(event) => void submit(event)}>
        <ProfileAvatar
          fallback={defaultProfileIcon}
          profile={{ username, icon }}
        />
        <div className="profile-editor__fields">
          <h2>
            {t(editingId ? 'profiles.editTitle' : 'profiles.createTitle')}
          </h2>
          <label>
            {t('profiles.username')}
            <input
              autoFocus
              maxLength={80}
              onChange={(e) => setUsername(e.target.value)}
              required
              value={username}
            />
          </label>
          <div className="profile-editor__icon-actions">
            <label className="profile-file">
              {t('profiles.chooseIcon')}
              <input
                accept=".bmp,image/bmp,image/jpeg,image/png"
                onChange={chooseIcon}
                type="file"
              />
            </label>
            {icon ? (
              <button
                className="profile-button profile-button--danger"
                onClick={() => setIcon(undefined)}
                type="button"
              >
                {t('profiles.removeImage')}
              </button>
            ) : null}
          </div>
          <small>{t('profiles.iconHelp')}</small>
          {error ? <p role="alert">{error}</p> : null}
          <div className="profile-editor__actions">
            <button
              className="profile-button profile-button--primary"
              type="submit"
            >
              {t(editingId ? 'profiles.save' : 'profiles.create')}
            </button>
            {editingId ? (
              <button className="profile-button" onClick={reset} type="button">
                {t('profiles.cancel')}
              </button>
            ) : null}
          </div>
        </div>
      </form>
      <section className="profile-manager__list">
        <div className="profile-manager__list-heading">
          <div>
            <h2>{t('profiles.listTitle')}</h2>
            <p>{t('profiles.listSummary')}</p>
          </div>
          <span>{t('profiles.count', { count: profiles.length })}</span>
        </div>
        <div className="profile-list">
          {profiles.map(({ profile, isActive }) => (
            <article className="profile-row" key={profile.id}>
              <ProfileAvatar fallback={defaultProfileIcon} profile={profile} />
              <div className="profile-row__details">
                <strong>{profile.username}</strong>
                <span>
                  {t('profiles.created', {
                    date: formatDateTime(
                      profile.createdAt,
                      dateTimeFormat,
                      i18n.language,
                      false,
                    ),
                  })}
                </span>
                <small>{profile.id}</small>
              </div>
              {isActive ? (
                <span className="profile-status">{t('profiles.active')}</span>
              ) : null}
              <button
                className="profile-button"
                onClick={() => {
                  setEditingId(profile.id);
                  setUsername(profile.username);
                  setIcon(profile.icon);
                }}
                type="button"
              >
                {t('profiles.edit')}
              </button>
              <button
                className="profile-button"
                onClick={() =>
                  void onDuplicate(profile.id).catch(() => undefined)
                }
                type="button"
              >
                {t('profiles.duplicate')}
              </button>
              {pendingDeleteId === profile.id ? (
                <>
                  <button
                    className="profile-button profile-button--danger"
                    onClick={() => {
                      setPendingDeleteId(undefined);
                      void onDelete(profile.id).catch(() => undefined);
                    }}
                    type="button"
                  >
                    {t('profiles.confirmDelete')}
                  </button>
                  <button
                    className="profile-button"
                    onClick={() => setPendingDeleteId(undefined)}
                    type="button"
                  >
                    {t('profiles.cancelDelete')}
                  </button>
                </>
              ) : (
                <button
                  className="profile-button profile-button--danger"
                  disabled={isActive || profiles.length === 1}
                  onClick={() => {
                    if (confirmDeletion) setPendingDeleteId(profile.id);
                    else void onDelete(profile.id).catch(() => undefined);
                  }}
                  type="button"
                >
                  {t('profiles.delete')}
                </button>
              )}
            </article>
          ))}
        </div>
      </section>
    </dialog>
  );
}
