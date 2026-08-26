import { useTranslation } from 'react-i18next';

import {
  type SearchField,
  type SearchPreferences,
} from '../../domain/bookmark-search';

interface Props {
  className?: string;
  preferences: SearchPreferences;
  profileCount: number;
  onChange(preferences: SearchPreferences): void;
}

const fieldKeys: readonly SearchField[] = [
  'title',
  'url',
  'tags',
  'note',
  'folderTitle',
];

/** Keeps Search-window session options and durable Settings controls aligned. */
export function SearchOptions({
  className = '',
  onChange,
  preferences,
  profileCount,
}: Props) {
  const { t } = useTranslation();
  const setPreference = <Key extends keyof SearchPreferences>(
    key: Key,
    value: SearchPreferences[Key],
  ) => onChange({ ...preferences, [key]: value });
  const toggleField = (field: SearchField) => {
    const selected = preferences.fields.includes(field);
    if (selected && preferences.fields.length === 1) return;
    onChange({
      ...preferences,
      fields: selected
        ? preferences.fields.filter((value) => value !== field)
        : [...preferences.fields, field],
    });
  };

  return (
    <div className={`search-options ${className}`.trim()}>
      <label className="search-options__check search-options__wide">
        <input
          checked={preferences.allProfiles}
          disabled={profileCount < 2}
          onChange={(event) =>
            setPreference('allProfiles', event.target.checked)
          }
          type="checkbox"
        />
        <span>{t('searchWindow.options.allProfiles')}</span>
      </label>
      <label>
        <span>{t('searchWindow.options.itemType')}</span>
        <select
          onChange={(event) =>
            setPreference(
              'itemType',
              event.target.value as SearchPreferences['itemType'],
            )
          }
          value={preferences.itemType}
        >
          <option value="all">{t('searchWindow.options.allItems')}</option>
          <option value="bookmark">
            {t('searchWindow.options.bookmarks')}
          </option>
          <option value="folder">{t('searchWindow.options.folders')}</option>
        </select>
      </label>
      <label>
        <span>{t('searchWindow.options.location')}</span>
        <select
          disabled={preferences.allProfiles}
          onChange={(event) =>
            setPreference(
              'location',
              event.target.value as SearchPreferences['location'],
            )
          }
          value={preferences.location}
        >
          <option value="current-folder">
            {t('searchWindow.options.currentFolder')}
          </option>
          <option value="descendants">
            {t('searchWindow.options.descendants')}
          </option>
          <option value="current-profile">
            {t('searchWindow.options.currentProfile')}
          </option>
        </select>
      </label>
      <label>
        <span>{t('searchWindow.options.match')}</span>
        <select
          onChange={(event) =>
            setPreference(
              'match',
              event.target.value as SearchPreferences['match'],
            )
          }
          value={preferences.match}
        >
          <option value="best">{t('searchWindow.options.bestMatch')}</option>
          <option value="contains">{t('searchWindow.options.contains')}</option>
          <option value="exact">{t('searchWindow.options.exact')}</option>
        </select>
      </label>
      <label>
        <span>{t('searchWindow.options.sort')}</span>
        <select
          onChange={(event) =>
            setPreference(
              'sort',
              event.target.value as SearchPreferences['sort'],
            )
          }
          value={preferences.sort}
        >
          <option value="best">{t('searchWindow.options.bestMatch')}</option>
          <option value="title">{t('searchWindow.options.titleSort')}</option>
          <option value="url">{t('searchWindow.options.urlSort')}</option>
          <option value="createdAt">{t('searchWindow.options.created')}</option>
          <option value="updatedAt">{t('searchWindow.options.updated')}</option>
        </select>
      </label>
      {preferences.sort !== 'best' ? (
        <label>
          <span>{t('searchWindow.options.direction')}</span>
          <select
            onChange={(event) =>
              setPreference(
                'sortDirection',
                event.target.value as SearchPreferences['sortDirection'],
              )
            }
            value={preferences.sortDirection}
          >
            <option value="ascending">
              {t('searchWindow.options.ascending')}
            </option>
            <option value="descending">
              {t('searchWindow.options.descending')}
            </option>
          </select>
        </label>
      ) : null}
      <fieldset className="search-options__fields">
        <legend>{t('searchWindow.options.fields')}</legend>
        {fieldKeys.map((field) => (
          <label className="search-options__check" key={field}>
            <input
              checked={preferences.fields.includes(field)}
              onChange={() => toggleField(field)}
              type="checkbox"
            />
            <span>{t(`searchWindow.fields.${field}`)}</span>
          </label>
        ))}
      </fieldset>
    </div>
  );
}
