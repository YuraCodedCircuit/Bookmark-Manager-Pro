import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ProfileIcon } from '../../components/icons/ProfileIcon';
import { ImportChild } from '../import/ImportChild';
import { ImportFilter } from '../import/ImportFilter';
import { ImportFooter } from '../import/ImportFooter';

/**
 * Reuses the destination picker for a local filter. Active marks the application
 * profile independently of the selected display filter.
 */
export function ActivityLogProfileDialog({
  choices,
  selected,
  onSelect,
  onClose,
}: {
  choices: readonly { id: string; name: string; active?: boolean }[];
  selected: string;
  onSelect(id: string): void;
  onClose(): void;
}) {
  const { t } = useTranslation();
  const activeBadgeId = useId();
  const [query, setQuery] = useState('');
  const visible = choices.filter((choice) =>
    choice.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
  );
  return (
    <ImportChild title={t('activityRebuild.chooseProfile')} onClose={onClose}>
      <div className="import-child__body">
        <ImportFilter
          label={t('activityRebuild.filterProfiles')}
          value={query}
          onChange={setQuery}
        />
        <div className="export-profile-picker__list">
          <fieldset className="import-profile-group">
            <legend className="visually-hidden">
              {t('activityRebuild.chooseProfile')}
            </legend>
            {visible.map((choice) => (
              <label
                className="settings-checkbox-row export-profile-picker__row"
                key={choice.id}
              >
                <input
                  type="radio"
                  name="activity-log-profile"
                  aria-label={choice.name}
                  aria-describedby={choice.active ? activeBadgeId : undefined}
                  checked={selected === choice.id}
                  onChange={() => onSelect(choice.id)}
                />
                <span className="import-profile-avatar">
                  <ProfileIcon />
                </span>
                <span className="export-profile-picker__identity">
                  <strong>{choice.name}</strong>
                </span>
                {choice.active ? (
                  <small id={activeBadgeId} className="profile-status">
                    {t('profiles.active')}
                  </small>
                ) : null}
              </label>
            ))}
            {!visible.length ? (
              <p className="folder-tree__empty" role="status">
                {t('backup.noMatchingProfiles')}
              </p>
            ) : null}
          </fieldset>
        </div>
      </div>
      <ImportFooter>
        <p className="export-profile-picker__count">
          {t('activityRebuild.selectedProfile', {
            name: choices.find((choice) => choice.id === selected)?.name ?? '',
          })}
        </p>
        <button type="button" onClick={onClose}>
          {t('searchWindow.options.closeAction')}
        </button>
      </ImportFooter>
    </ImportChild>
  );
}
