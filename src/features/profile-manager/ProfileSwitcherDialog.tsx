import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { ProfileListItem } from '../../application/profile/profile-management-repository';
import type { ProfilePreferences } from '../../domain/profile-settings';
import { ClearIcon } from '../../components/icons/ClearIcon';
import { ProfileAvatar } from './ProfileAvatar';
import { formatDateTime } from '../../shared/date-time-format';
import type { DateTimeFormatPreference } from '../../shared/date-time-format';

interface Props {
  defaultProfileIcon?: ProfilePreferences['defaultProfileIcon'];
  isOpen: boolean;
  profiles: readonly ProfileListItem[];
  onClose(): void;
  onSwitch(profileId: string): Promise<void>;
  dateTimeFormat?: DateTimeFormatPreference;
}

/** Focused profile-selection window; profile mutation stays in the manager. */
export function ProfileSwitcherDialog({
  defaultProfileIcon = 'built-in',
  isOpen,
  profiles,
  onClose,
  onSwitch,
  dateTimeFormat = 'browser',
}: Props) {
  const { t, i18n } = useTranslation();
  const ref = useRef<HTMLDialogElement>(null);
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

  return (
    <dialog
      aria-labelledby="switch-profile-title"
      className="profile-window profile-switcher"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      ref={ref}
    >
      <header className="profile-window__header">
        <div>
          <h1 id="switch-profile-title">{t('profiles.switchTitle')}</h1>
          <p>{t('profiles.switchSummary')}</p>
        </div>
        <button
          aria-label={t('profiles.close')}
          onClick={onClose}
          type="button"
        >
          <ClearIcon />
        </button>
      </header>
      <div className="profile-list">
        {profiles.map(({ profile, isActive }) => (
          <article
            className={`profile-row${isActive ? ' profile-row--active' : ''}`}
            key={profile.id}
          >
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
            ) : (
              <button
                className="profile-button profile-button--primary"
                onClick={() => void onSwitch(profile.id).catch(() => undefined)}
                type="button"
              >
                {t('profiles.switch')}
              </button>
            )}
          </article>
        ))}
      </div>
      <p className="profile-window__note">{t('profiles.switchNote')}</p>
    </dialog>
  );
}
