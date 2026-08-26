import { useMemo, useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';

import type {
  ProfileListItem,
  ProfileStorageUsage,
} from '../../application/profile/profile-management-repository';
import {
  defaultProfilePreferences,
  type ProfilePreferences,
} from '../../domain/profile-settings';

interface ProfilesSettingsPanelProps {
  preferences?: ProfilePreferences;
  profiles: readonly ProfileListItem[];
  storageUsage: readonly ProfileStorageUsage[];
}

const chartColors = [
  '#4f8ce8',
  '#8b63d2',
  '#23a8b7',
  '#e2b849',
  '#dc786d',
  '#6bcba0',
];

/** Renders profile defaults and a privacy-safe estimate of local profile storage. */
export function ProfilesSettingsPanel({
  preferences = defaultProfilePreferences,
  profiles,
  storageUsage,
}: ProfilesSettingsPanelProps) {
  const { i18n, t } = useTranslation();
  const [showSizes, setShowSizes] = useState(false);
  const [unlimited, setUnlimited] = useState(
    preferences.maximumProfiles === null,
  );
  const rows = profiles.map(({ profile }, index) => ({
    color: chartColors[index % chartColors.length],
    id: profile.id,
    name: profile.username,
    sizeBytes:
      storageUsage.find(({ profileId }) => profileId === profile.id)
        ?.sizeBytes ?? 0,
  }));
  const total = rows.reduce((sum, row) => sum + row.sizeBytes, 0);
  const chartBackground = useMemo(() => {
    if (total === 0) return '#33465a';
    let cursor = 0;
    return `conic-gradient(${rows
      .map((row) => {
        const start = cursor;
        cursor += (row.sizeBytes / total) * 100;
        return `${row.color} ${start}% ${cursor}%`;
      })
      .join(', ')})`;
  }, [rows, total]);

  return (
    <section aria-labelledby="settings-profiles-title">
      <div className="settings-dialog__section-heading">
        <h2 id="settings-profiles-title">
          {t('displaySettings.category.profiles')}
        </h2>
        <p>{t('displaySettings.profiles.description')}</p>
      </div>

      <fieldset className="profile-settings__storage">
        <legend>{t('displaySettings.profiles.storage')}</legend>
        <div className="profile-storage-chart-layout">
          <div
            aria-label={t('displaySettings.profiles.storageChartLabel', {
              total: formatBytes(total, i18n.language),
            })}
            className="profile-storage-chart"
            role="img"
            style={
              { '--profile-storage-chart': chartBackground } as CSSProperties
            }
          >
            <div>
              <strong>{formatBytes(total, i18n.language)}</strong>
              <span>{t('displaySettings.profiles.total')}</span>
            </div>
          </div>
          <div className="profile-storage-summary">
            <strong>
              {t('displaySettings.profiles.profileCount', {
                count: profiles.length,
              })}
            </strong>
            <button
              aria-expanded={showSizes}
              className="profile-storage-toggle"
              onClick={() => setShowSizes((shown) => !shown)}
              type="button"
            >
              {t(
                showSizes
                  ? 'displaySettings.profiles.hideSizes'
                  : 'displaySettings.profiles.showSizes',
              )}
            </button>
          </div>
        </div>
        {showSizes ? (
          <ul className="profile-storage-list">
            {rows.map((row) => (
              <li key={row.id}>
                <span aria-hidden="true" style={{ background: row.color }} />
                <strong>{row.name}</strong>
                <output>{formatBytes(row.sizeBytes, i18n.language)}</output>
              </li>
            ))}
          </ul>
        ) : null}
        <p className="settings-dialog__help">
          {t('displaySettings.profiles.storageHelp')}
        </p>
      </fieldset>

      <fieldset>
        <legend>{t('displaySettings.profiles.creation')}</legend>
        <label className="settings-checkbox-row">
          <input
            checked={unlimited}
            name="maximumProfilesUnlimited"
            onChange={(event) => setUnlimited(event.currentTarget.checked)}
            type="checkbox"
          />
          <span>{t('displaySettings.profiles.unlimited')}</span>
        </label>
        <label>
          <span>{t('displaySettings.profiles.maximumProfiles')}</span>
          <input
            defaultValue={preferences.maximumProfiles ?? 10}
            disabled={unlimited}
            max="1000"
            min={Math.max(1, profiles.length)}
            name="maximumProfiles"
            type="number"
          />
        </label>
      </fieldset>

      <fieldset>
        <legend>{t('displaySettings.profiles.duplicateContent')}</legend>
        {(
          [
            ['duplicateBookmarks', 'bookmarksAndFolders'],
            ['duplicateSettings', 'profileSettings'],
            ['duplicateActivityLogs', 'activityLogs'],
            ['duplicateFavorites', 'favorites'],
            ['duplicateAppearance', 'appearance'],
            ['duplicateImages', 'imagesAndIcon'],
          ] as const
        ).map(([name, label]) => (
          <label className="settings-checkbox-row" key={name}>
            <input
              defaultChecked={preferences[name]}
              name={name}
              type="checkbox"
            />
            <span>{t(`displaySettings.profiles.${label}`)}</span>
          </label>
        ))}
      </fieldset>

      <fieldset>
        <legend>{t('displaySettings.profiles.behavior')}</legend>
        <label className="settings-checkbox-row">
          <input
            defaultChecked={preferences.appendCopyToDuplicateName}
            name="appendCopyToDuplicateName"
            type="checkbox"
          />
          <span>{t('displaySettings.profiles.appendCopy')}</span>
        </label>
        <label className="settings-checkbox-row">
          <input
            defaultChecked={preferences.reopenLastFolderOnSwitch}
            name="reopenLastFolderOnSwitch"
            type="checkbox"
          />
          <span>{t('displaySettings.profiles.reopenLastFolder')}</span>
        </label>
        <label className="settings-checkbox-row">
          <input
            defaultChecked={preferences.confirmProfileDeletion}
            name="confirmProfileDeletion"
            type="checkbox"
          />
          <span>{t('displaySettings.profiles.confirmDeletion')}</span>
        </label>
        <label>
          <span>{t('displaySettings.profiles.startupProfile')}</span>
          <select
            defaultValue={preferences.startupProfileMode}
            name="startupProfileMode"
          >
            <option value="active">
              {t('displaySettings.profiles.activeProfile')}
            </option>
            <option value="ask">
              {t('displaySettings.profiles.askEveryTime')}
            </option>
          </select>
        </label>
        <label>
          <span>{t('displaySettings.profiles.defaultIcon')}</span>
          <select
            defaultValue={preferences.defaultProfileIcon}
            name="defaultProfileIcon"
          >
            <option value="built-in">
              {t('displaySettings.profiles.builtInIcon')}
            </option>
            <option value="initials">
              {t('displaySettings.profiles.initials')}
            </option>
            <option value="none">{t('displaySettings.profiles.noIcon')}</option>
          </select>
        </label>
      </fieldset>
    </section>
  );
}

/** Formats estimated byte counts without exposing profile content. */
function formatBytes(bytes: number, locale: string): string {
  if (bytes < 1_024) return `${bytes.toLocaleString(locale)} B`;
  if (bytes < 1_048_576)
    return `${(bytes / 1_024).toLocaleString(locale, { maximumFractionDigits: 1 })} KB`;
  return `${(bytes / 1_048_576).toLocaleString(locale, { maximumFractionDigits: 1 })} MB`;
}
