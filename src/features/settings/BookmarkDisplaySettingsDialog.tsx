import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import type { ProfileSettings } from '../../domain/profile-settings';
import type { ActivityLogSettings } from '../../domain/activity-log';
import {
  defaultBackupPreferences,
  defaultNotificationPreferences,
  defaultProfilePreferences,
} from '../../domain/profile-settings';
import type {
  ProfileListItem,
  ProfileStorageUsage,
} from '../../application/profile/profile-management-repository';
import { SettingsCategoryIcon } from './SettingsCategoryIcon';
import { ProfilesSettingsPanel } from './ProfilesSettingsPanel';
import { SearchOptions } from '../search/SearchOptions';
import { defaultSearchPreferences } from '../../domain/bookmark-search';
import { defaultShortcutPreferences } from '../../domain/keyboard-shortcuts';
import { ShortcutSettingsPanel } from './ShortcutSettingsPanel';
import {
  isSettingsCategoryDisabled,
  settingsCategories,
  type SettingsCategory,
} from './settings-categories';
import {
  getSettingsCategoryMatches,
  highlightSettingsMatches,
} from './settings-search';

const FEATURE_REQUEST_URL =
  'https://github.com/YuraCodedCircuit/Bookmark-Manager-Pro/issues/new';

interface BookmarkDisplaySettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (value: ProfileSettings) => Promise<void>;
  onSaveActivitySettings: (value: ActivityLogSettings) => Promise<void>;
  onSaveUpdateAnnouncements?: (enabled: boolean) => Promise<void>;
  onOpenExternalLink?: (url: string) => void;
  profiles: readonly ProfileListItem[];
  activityLogSettings: ActivityLogSettings;
  settings: ProfileSettings;
  storageUsage: readonly ProfileStorageUsage[];
  updateAnnouncementsEnabled?: boolean;
}

/**
 * Presents profile-owned application settings in a searchable category layout.
 * Form values remain local until Save succeeds, so Cancel never mutates the
 * active profile. Additional categories can be added without changing the
 * dialog's top navigation/content and bottom action structure.
 */
export function BookmarkDisplaySettingsDialog({
  isOpen,
  activityLogSettings,
  onClose,
  onSave,
  onSaveActivitySettings,
  onSaveUpdateAnnouncements = async () => undefined,
  onOpenExternalLink = () => undefined,
  profiles,
  settings,
  storageUsage,
  updateAnnouncementsEnabled = true,
}: BookmarkDisplaySettingsDialogProps) {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLElement>(null);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] =
    useState<SettingsCategory>('general');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const [accentColorMode, setAccentColorMode] = useState(
    settings.accentColorMode ?? 'system',
  );
  const [startupLocation, setStartupLocation] = useState(
    settings.startupLocation ?? 'home',
  );
  const [bookmarkSortBy, setBookmarkSortBy] = useState(
    settings.bookmarkSortBy ?? 'manual',
  );
  const [searchPreferences, setSearchPreferences] = useState(
    settings.searchPreferences ?? defaultSearchPreferences,
  );
  const [shortcutPreferences, setShortcutPreferences] = useState(
    settings.shortcutPreferences ?? defaultShortcutPreferences,
  );
  const initialNotificationPreferences =
    settings.notificationPreferences ?? defaultNotificationPreferences;
  const [notificationLineUsesForeground, setNotificationLineUsesForeground] =
    useState(initialNotificationPreferences.countdownLineColor === null);
  const [notificationLineColor, setNotificationLineColor] = useState(
    initialNotificationPreferences.countdownLineColor ?? '#f6f8fb',
  );

  const normalizedSearch = search.trim().toLocaleLowerCase();
  const categoryMatches = useMemo(
    () => getSettingsCategoryMatches(t, normalizedSearch),
    [normalizedSearch, t],
  );
  const enabledMatches = settingsCategories.filter(
    (category) =>
      !isSettingsCategoryDisabled(category) && categoryMatches.has(category),
  );
  const hasSearch = normalizedSearch.length > 0;
  const hasResults = !hasSearch || enabledMatches.length > 0;
  const selectedCategoryMatches =
    !hasSearch || categoryMatches.has(selectedCategory);
  const showGeneral = selectedCategory === 'general' && selectedCategoryMatches;
  const showProfiles =
    selectedCategory === 'profiles' && selectedCategoryMatches;
  const showAppearance =
    selectedCategory === 'appearance' && selectedCategoryMatches;
  const showLanguage =
    selectedCategory === 'language' && selectedCategoryMatches;
  const showNotifications =
    selectedCategory === 'notifications' && selectedCategoryMatches;
  const showActivity =
    selectedCategory === 'activity' && selectedCategoryMatches;
  const showSecurity =
    selectedCategory === 'security' && selectedCategoryMatches;
  const showAccessibility =
    selectedCategory === 'accessibility' && selectedCategoryMatches;
  const showBookmarks =
    selectedCategory === 'bookmarks' && selectedCategoryMatches;
  const showSearch = selectedCategory === 'search' && selectedCategoryMatches;
  const showBackup = selectedCategory === 'backup' && selectedCategoryMatches;
  const showShortcuts =
    selectedCategory === 'shortcuts' && selectedCategoryMatches;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) {
      setSearch('');
      setSelectedCategory('general');
      setError(false);
      setStartupLocation(settings.startupLocation ?? 'home');
      setAccentColorMode(settings.accentColorMode ?? 'system');
      setBookmarkSortBy(settings.bookmarkSortBy ?? 'manual');
      setSearchPreferences(
        settings.searchPreferences ?? defaultSearchPreferences,
      );
      setShortcutPreferences(
        settings.shortcutPreferences ?? defaultShortcutPreferences,
      );
      const notificationPreferences =
        settings.notificationPreferences ?? defaultNotificationPreferences;
      setNotificationLineUsesForeground(
        notificationPreferences.countdownLineColor === null,
      );
      setNotificationLineColor(
        notificationPreferences.countdownLineColor ?? '#f6f8fb',
      );
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
      requestAnimationFrame(() => searchRef.current?.focus());
    }
    if (!isOpen && dialog.open) {
      if (typeof dialog.close === 'function') dialog.close();
      else dialog.removeAttribute('open');
    }
  }, [
    isOpen,
    settings.accentColorMode,
    settings.bookmarkSortBy,
    settings.searchPreferences,
    settings.shortcutPreferences,
    settings.startupLocation,
    settings.notificationPreferences,
  ]);

  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    let clearHighlight = highlightSettingsMatches(content, normalizedSearch);
    const observer = new MutationObserver((mutations) => {
      const contentChanged = mutations.some((mutation) =>
        [...mutation.addedNodes, ...mutation.removedNodes].some(
          (node) =>
            !(node instanceof Element) ||
            !node.classList.contains('settings-dialog__choice-highlight'),
        ),
      );
      if (!contentChanged) return;
      clearHighlight();
      clearHighlight = highlightSettingsMatches(content, normalizedSearch);
    });
    observer.observe(content, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      clearHighlight();
    };
  }, [normalizedSearch, selectedCategory]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setSaving(true);
    setError(false);
    try {
      const currentPreferences =
        settings.profilePreferences ?? defaultProfilePreferences;
      if (showActivity) {
        await onSaveActivitySettings({
          ...activityLogSettings,
          enabled: data.has('activityLogEnabled'),
        });
      } else
        await onSave(
          showProfiles
            ? {
                ...settings,
                profilePreferences: {
                  appendCopyToDuplicateName: data.has(
                    'appendCopyToDuplicateName',
                  ),
                  confirmProfileDeletion: data.has('confirmProfileDeletion'),
                  defaultProfileIcon:
                    data.get('defaultProfileIcon') === 'initials'
                      ? 'initials'
                      : data.get('defaultProfileIcon') === 'none'
                        ? 'none'
                        : 'built-in',
                  duplicateActivityLogs: data.has('duplicateActivityLogs'),
                  duplicateAppearance: data.has('duplicateAppearance'),
                  duplicateBookmarks: data.has('duplicateBookmarks'),
                  duplicateFavorites: data.has('duplicateFavorites'),
                  duplicateImages: data.has('duplicateImages'),
                  duplicateSettings: data.has('duplicateSettings'),
                  maximumProfiles: data.has('maximumProfilesUnlimited')
                    ? null
                    : Number(data.get('maximumProfiles')),
                  reopenLastFolderOnSwitch: data.has(
                    'reopenLastFolderOnSwitch',
                  ),
                  startupProfileMode:
                    data.get('startupProfileMode') === 'ask' ? 'ask' : 'active',
                },
              }
            : showGeneral
              ? {
                  ...settings,
                  bookmarkOpening:
                    data.get('bookmarkOpening') === 'new-tab'
                      ? 'new-tab'
                      : 'current-tab',
                  folderOpening:
                    data.get('folderOpening') === 'double-click'
                      ? 'double-click'
                      : 'single-click',
                  startupLocation,
                }
              : showLanguage
                ? {
                    ...settings,
                    dateTimeFormat:
                      data.get('dateTimeFormat') === 'american'
                        ? 'american'
                        : data.get('dateTimeFormat') === 'international'
                          ? 'international'
                          : data.get('dateTimeFormat') === 'iso'
                            ? 'iso'
                            : 'browser',
                    firstDayOfWeek:
                      data.get('firstDayOfWeek') === 'sunday'
                        ? 'sunday'
                        : data.get('firstDayOfWeek') === 'monday'
                          ? 'monday'
                          : data.get('firstDayOfWeek') === 'saturday'
                            ? 'saturday'
                            : 'browser',
                    language: 'en-US',
                  }
                : showBookmarks
                  ? {
                      ...settings,
                      confirmFolderDrop: data.has('confirmFolderDrop'),
                      dragAndDropEnabled: data.has('dragAndDropEnabled'),
                      dropIntoFoldersEnabled: data.has(
                        'dropIntoFoldersEnabled',
                      ),
                      folderDropHoverDelay:
                        Number(data.get('folderDropHoverDelay')) === 400
                          ? 400
                          : Number(data.get('folderDropHoverDelay')) === 900
                            ? 900
                            : 600,
                      openFolderAfterDrop: data.get('afterMove') === 'open',
                      duplicateHandling:
                        data.get('duplicateHandling') === 'warn'
                          ? 'warn'
                          : data.get('duplicateHandling') === 'prevent'
                            ? 'prevent'
                            : 'allow',
                      urlNormalization:
                        data.get('urlNormalization') === 'add' ? 'add' : 'ask',
                      faviconDisplay:
                        data.get('faviconDisplay') === 'initials'
                          ? 'initials'
                          : 'available',
                      missingFavicon:
                        data.get('missingFavicon') === 'built-in'
                          ? 'built-in'
                          : data.get('missingFavicon') === 'none'
                            ? 'none'
                            : 'initials',
                      folderIcon:
                        data.get('folderIcon') === 'none' ? 'none' : 'initials',
                      rememberLastAppearance: data.has(
                        'rememberLastAppearance',
                      ),
                      tagOrder:
                        data.get('tagOrder') === 'alphabetical'
                          ? 'alphabetical'
                          : 'preserve',
                    }
                  : showSearch
                    ? { ...settings, searchPreferences }
                    : showNotifications
                      ? {
                          ...settings,
                          notificationPreferences: {
                            countdownLineColor: notificationLineUsesForeground
                              ? null
                              : notificationLineColor,
                            enabled: data.has('notificationsEnabled'),
                            order:
                              data.get('notificationOrder') === 'oldest'
                                ? 'oldest'
                                : 'newest',
                            position:
                              data.get('notificationPosition') === 'top-left'
                                ? 'top-left'
                                : data.get('notificationPosition') ===
                                    'top-right'
                                  ? 'top-right'
                                  : data.get('notificationPosition') ===
                                      'bottom-left'
                                    ? 'bottom-left'
                                    : 'bottom-right',
                            stackLimit:
                              Number(data.get('notificationStackLimit')) === 6
                                ? 6
                                : Number(data.get('notificationStackLimit')) ===
                                    9
                                  ? 9
                                  : 3,
                          },
                        }
                      : showBackup
                        ? {
                            ...settings,
                            backupPreferences: {
                              automaticEnabled: data.has(
                                'backupAutomaticEnabled',
                              ),
                              beforeDatabaseUpgrade: data.has(
                                'backupBeforeDatabaseUpgrade',
                              ),
                              beforeImport: data.has('backupBeforeImport'),
                              beforeProfileReset: data.has(
                                'backupBeforeProfileReset',
                              ),
                              beforeSynchronization: data.has(
                                'backupBeforeSynchronization',
                              ),
                              retentionPerTrigger: [3, 10, 20].includes(
                                Number(data.get('backupRetention')),
                              )
                                ? (Number(data.get('backupRetention')) as
                                    3 | 10 | 20)
                                : 5,
                            },
                          }
                        : showSecurity
                          ? {
                              ...settings,
                              confirmExternalLinks: data.has(
                                'confirmExternalLinks',
                              ),
                            }
                          : showAccessibility
                            ? {
                                ...settings,
                                animationPreference:
                                  data.get('animationPreference') === 'reduced'
                                    ? 'reduced'
                                    : data.get('animationPreference') === 'none'
                                      ? 'none'
                                      : 'system',
                                highContrast: data.has('highContrast'),
                              }
                            : showShortcuts
                              ? { ...settings, shortcutPreferences }
                              : {
                                  ...settings,
                                  accentColorMode,
                                  bookmarkView:
                                    data.get('bookmarkView') === 'list'
                                      ? 'list'
                                      : data.get('bookmarkView') === 'details'
                                        ? 'details'
                                        : 'card',
                                  cardSize:
                                    data.get('cardSize') === 'small'
                                      ? 'small'
                                      : data.get('cardSize') === 'large'
                                        ? 'large'
                                        : 'medium',
                                  cardSpacing:
                                    data.get('cardSpacing') === 'compact'
                                      ? 'compact'
                                      : data.get('cardSpacing') === 'spacious'
                                        ? 'spacious'
                                        : 'comfortable',
                                  bookmarkSortBy:
                                    data.get('bookmarkSortBy') === 'title'
                                      ? 'title'
                                      : data.get('bookmarkSortBy') ===
                                          'createdAt'
                                        ? 'createdAt'
                                        : data.get('bookmarkSortBy') ===
                                            'updatedAt'
                                          ? 'updatedAt'
                                          : data.get('bookmarkSortBy') ===
                                              'domain'
                                            ? 'domain'
                                            : 'manual',
                                  bookmarkSortDirection:
                                    data.get('bookmarkSortDirection') ===
                                    'descending'
                                      ? 'descending'
                                      : 'ascending',
                                  bookmarkGroupBy:
                                    data.get('bookmarkGroupBy') === 'type'
                                      ? 'type'
                                      : data.get('bookmarkGroupBy') === 'domain'
                                        ? 'domain'
                                        : 'none',
                                  customAccentColor:
                                    data.get('customAccentColor')?.toString() ||
                                    settings.customAccentColor ||
                                    '#88bdf2',
                                  profilePreferences: currentPreferences,
                                  scrollbarBehavior:
                                    data.get('scrollbarBehavior') === 'always'
                                      ? 'always'
                                      : data.get('scrollbarBehavior') ===
                                          'scrolling'
                                        ? 'scrolling'
                                        : 'system',
                                  theme:
                                    data.get('theme') === 'light'
                                      ? 'light'
                                      : data.get('theme') === 'dark'
                                        ? 'dark'
                                        : 'system',
                                },
        );
      if (showGeneral)
        await onSaveUpdateAnnouncements(data.has('showWhatsNewAfterUpdate'));
      onClose();
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <dialog
      aria-label={t('displaySettings.title')}
      className="settings-dialog"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      ref={dialogRef}
    >
      <form onSubmit={(event) => void submit(event)}>
        <div className="settings-dialog__workspace">
          <aside aria-label={t('displaySettings.categories')}>
            <label className="settings-dialog__search">
              <span className="visually-hidden">
                {t('displaySettings.search')}
              </span>
              <input
                onChange={(event) => {
                  const nextSearch = event.currentTarget.value;
                  const nextNormalizedSearch = nextSearch
                    .trim()
                    .toLocaleLowerCase();
                  const nextMatches = getSettingsCategoryMatches(
                    t,
                    nextNormalizedSearch,
                  );
                  const firstMatch = settingsCategories.find(
                    (category) =>
                      !isSettingsCategoryDisabled(category) &&
                      nextMatches.has(category),
                  );
                  setSearch(nextSearch);
                  if (
                    nextNormalizedSearch &&
                    !nextMatches.has(selectedCategory) &&
                    firstMatch
                  )
                    setSelectedCategory(firstMatch);
                }}
                onKeyDown={(event) => {
                  if (event.key !== 'Escape' || !search) return;
                  event.preventDefault();
                  event.stopPropagation();
                  setSearch('');
                }}
                placeholder={t('displaySettings.search')}
                ref={searchRef}
                type="search"
                value={search}
              />
            </label>
            <nav aria-label={t('displaySettings.categories')}>
              {settingsCategories.map((category) => {
                const permanentlyDisabled =
                  isSettingsCategoryDisabled(category);
                const hasMatch = hasSearch && categoryMatches.has(category);
                const searchDisabled = hasSearch && !hasMatch;
                const label = t(`displaySettings.category.${category}`);
                return (
                  <button
                    aria-current={
                      hasResults && selectedCategory === category
                        ? 'page'
                        : undefined
                    }
                    aria-label={
                      hasMatch && !permanentlyDisabled
                        ? `${label}. ${t('displaySettings.containsSearchMatch')}`
                        : undefined
                    }
                    disabled={permanentlyDisabled || searchDisabled}
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    type="button"
                  >
                    <SettingsCategoryIcon category={category} />
                    <span>{label}</span>
                    {hasMatch && !permanentlyDisabled ? (
                      <span
                        aria-hidden="true"
                        className="settings-dialog__match-dot"
                      />
                    ) : null}
                  </button>
                );
              })}
            </nav>
            <footer className="settings-dialog__sidebar-footer">
              <p>{t('displaySettings.footerCredit')}</p>
            </footer>
          </aside>

          <section
            aria-label={t(`displaySettings.category.${selectedCategory}`)}
            className="settings-dialog__content"
            ref={contentRef}
            role="region"
          >
            {showGeneral ? (
              <section aria-labelledby="settings-general-title" key="general">
                <div className="settings-dialog__section-heading">
                  <h2 id="settings-general-title">
                    {t('displaySettings.category.general')}
                  </h2>
                  <p>{t('displaySettings.generalDescription')}</p>
                </div>
                <fieldset>
                  <legend>{t('displaySettings.general.startup')}</legend>
                  <label>
                    <span>{t('displaySettings.general.startupLocation')}</span>
                    <select
                      onChange={(event) => {
                        setStartupLocation(
                          event.currentTarget.value === 'last'
                            ? 'last'
                            : 'home',
                        );
                      }}
                      name="startupLocation"
                      value={startupLocation}
                    >
                      <option value="home">
                        {t('displaySettings.general.openHome')}
                      </option>
                      <option value="last">
                        {t('displaySettings.general.openLastFolder')}
                      </option>
                    </select>
                  </label>
                  <label className="settings-checkbox-row">
                    <input
                      defaultChecked={updateAnnouncementsEnabled}
                      name="showWhatsNewAfterUpdate"
                      type="checkbox"
                    />
                    <span>
                      {t('displaySettings.general.showWhatsNewAfterUpdate')}
                    </span>
                  </label>
                </fieldset>
                <fieldset>
                  <legend>{t('displaySettings.general.opening')}</legend>
                  <label>
                    <span>{t('displaySettings.general.bookmarkOpening')}</span>
                    <select
                      defaultValue={settings.bookmarkOpening ?? 'current-tab'}
                      name="bookmarkOpening"
                    >
                      <option value="current-tab">
                        {t('displaySettings.general.currentTab')}
                      </option>
                      <option value="new-tab">
                        {t('displaySettings.general.newTab')}
                      </option>
                    </select>
                  </label>
                  <label>
                    <span>{t('displaySettings.general.folderOpening')}</span>
                    <select
                      defaultValue={settings.folderOpening ?? 'single-click'}
                      name="folderOpening"
                    >
                      <option value="single-click">
                        {t('displaySettings.general.singleClick')}
                      </option>
                      <option value="double-click">
                        {t('displaySettings.general.doubleClick')}
                      </option>
                    </select>
                  </label>
                  <p className="settings-dialog__help">
                    {t('displaySettings.general.lastFolderHelp')}
                  </p>
                </fieldset>
              </section>
            ) : showAppearance ? (
              <section
                aria-labelledby="settings-appearance-title"
                key="appearance"
              >
                <div className="settings-dialog__section-heading">
                  <h2 id="settings-appearance-title">
                    {t('displaySettings.category.appearance')}
                  </h2>
                  <p>{t('displaySettings.appearanceDescription')}</p>
                </div>
                <fieldset>
                  <legend>{t('displaySettings.appearance')}</legend>
                  <label>
                    <span>{t('displaySettings.theme')}</span>
                    <select defaultValue={settings.theme} name="theme">
                      <option value="system">
                        {t('displaySettings.systemTheme')}
                      </option>
                      <option value="dark">
                        {t('displaySettings.darkTheme')}
                      </option>
                      <option value="light">
                        {t('displaySettings.lightTheme')}
                      </option>
                    </select>
                  </label>
                  <label>
                    <span>{t('displaySettings.accentColor')}</span>
                    <select
                      name="accentColorMode"
                      onChange={(event) =>
                        setAccentColorMode(
                          event.currentTarget.value === 'custom'
                            ? 'custom'
                            : 'system',
                        )
                      }
                      value={accentColorMode}
                    >
                      <option value="system">
                        {t('displaySettings.defaultAccent')}
                      </option>
                      <option value="custom">
                        {t('displaySettings.customAccent')}
                      </option>
                    </select>
                  </label>
                  {accentColorMode === 'custom' ? (
                    <label>
                      <span>{t('displaySettings.customColor')}</span>
                      <input
                        aria-label={t('displaySettings.customColor')}
                        defaultValue={settings.customAccentColor ?? '#88bdf2'}
                        name="customAccentColor"
                        type="color"
                      />
                    </label>
                  ) : null}
                  <label>
                    <span>{t('displaySettings.scrollbars')}</span>
                    <select
                      defaultValue={settings.scrollbarBehavior ?? 'scrolling'}
                      name="scrollbarBehavior"
                    >
                      <option value="system">
                        {t('displaySettings.systemScrollbars')}
                      </option>
                      <option value="always">
                        {t('displaySettings.alwaysVisible')}
                      </option>
                      <option value="scrolling">
                        {t('displaySettings.whileScrolling')}
                      </option>
                    </select>
                  </label>
                </fieldset>
                <fieldset>
                  <legend>{t('displaySettings.bookmarkDisplay')}</legend>
                  <label>
                    <span>{t('displaySettings.view')}</span>
                    <select
                      defaultValue={settings.bookmarkView}
                      name="bookmarkView"
                    >
                      <option value="card">{t('displaySettings.card')}</option>
                      <option value="list">{t('displaySettings.list')}</option>
                      <option value="details">
                        {t('displaySettings.details')}
                      </option>
                    </select>
                  </label>
                  <label>
                    <span>{t('displaySettings.size')}</span>
                    <select defaultValue={settings.cardSize} name="cardSize">
                      <option value="small">
                        {t('displaySettings.small')}
                      </option>
                      <option value="medium">
                        {t('displaySettings.medium')}
                      </option>
                      <option value="large">
                        {t('displaySettings.large')}
                      </option>
                    </select>
                  </label>
                  <label>
                    <span>{t('displaySettings.spacing')}</span>
                    <select
                      defaultValue={settings.cardSpacing ?? 'comfortable'}
                      name="cardSpacing"
                    >
                      <option value="compact">
                        {t('displaySettings.compact')}
                      </option>
                      <option value="comfortable">
                        {t('displaySettings.comfortable')}
                      </option>
                      <option value="spacious">
                        {t('displaySettings.spacious')}
                      </option>
                    </select>
                  </label>
                  <label>
                    <span>{t('displaySettings.sortBy')}</span>
                    <select
                      onChange={(event) =>
                        setBookmarkSortBy(
                          event.target.value as typeof bookmarkSortBy,
                        )
                      }
                      value={bookmarkSortBy}
                      name="bookmarkSortBy"
                    >
                      <option value="manual">
                        {t('displaySettings.manualOrder')}
                      </option>
                      <option value="title">
                        {t('displaySettings.itemTitle')}
                      </option>
                      <option value="createdAt">
                        {t('displaySettings.dateCreated')}
                      </option>
                      <option value="updatedAt">
                        {t('displaySettings.dateModified')}
                      </option>
                      <option value="domain">
                        {t('displaySettings.domain')}
                      </option>
                    </select>
                  </label>
                  <label>
                    <span>{t('displaySettings.direction')}</span>
                    <select
                      defaultValue={
                        settings.bookmarkSortDirection ?? 'ascending'
                      }
                      disabled={bookmarkSortBy === 'manual'}
                      name="bookmarkSortDirection"
                    >
                      <option value="ascending">
                        {t('displaySettings.ascending')}
                      </option>
                      <option value="descending">
                        {t('displaySettings.descending')}
                      </option>
                    </select>
                  </label>
                  <label>
                    <span>{t('displaySettings.groupBy')}</span>
                    <select
                      defaultValue={settings.bookmarkGroupBy ?? 'none'}
                      name="bookmarkGroupBy"
                    >
                      <option value="none">{t('displaySettings.none')}</option>
                      <option value="type">{t('displaySettings.type')}</option>
                      <option value="domain">
                        {t('displaySettings.domain')}
                      </option>
                    </select>
                  </label>
                  <p className="settings-dialog__help">
                    {t('displaySettings.sortHelp')}
                  </p>
                  <p className="settings-dialog__help">
                    {t('displaySettings.displayHelp')}
                  </p>
                </fieldset>
              </section>
            ) : showProfiles ? (
              <ProfilesSettingsPanel
                preferences={
                  settings.profilePreferences ?? defaultProfilePreferences
                }
                profiles={profiles}
                storageUsage={storageUsage}
              />
            ) : showLanguage ? (
              <section aria-labelledby="settings-language-title" key="language">
                <div className="settings-dialog__section-heading">
                  <h2 id="settings-language-title">
                    {t('displaySettings.category.language')}
                  </h2>
                  <p>{t('displaySettings.languageSettings.description')}</p>
                </div>
                <fieldset>
                  <legend>{t('displaySettings.category.language')}</legend>
                  <label>
                    <span>
                      {t(
                        'displaySettings.languageSettings.applicationLanguage',
                      )}
                    </span>
                    <select disabled value="en-US">
                      <option value="en-US">
                        {t('displaySettings.languageSettings.americanEnglish')}
                      </option>
                    </select>
                  </label>
                  <p className="settings-dialog__help">
                    {t('displaySettings.languageSettings.languageHelp')}
                  </p>
                  <label>
                    <span>
                      {t('displaySettings.languageSettings.dateAndTime')}
                    </span>
                    <select
                      defaultValue={settings.dateTimeFormat ?? 'browser'}
                      name="dateTimeFormat"
                    >
                      <option value="browser">
                        {t('displaySettings.languageSettings.browserDefault')}
                      </option>
                      <option value="american">
                        {t('displaySettings.languageSettings.formatAmerican')}
                      </option>
                      <option value="international">
                        {t(
                          'displaySettings.languageSettings.formatInternational',
                        )}
                      </option>
                      <option value="iso">
                        {t('displaySettings.languageSettings.formatIso')}
                      </option>
                    </select>
                  </label>
                  <label>
                    <span>
                      {t('displaySettings.languageSettings.firstDay')}
                    </span>
                    <select
                      defaultValue={settings.firstDayOfWeek ?? 'browser'}
                      name="firstDayOfWeek"
                    >
                      <option value="browser">
                        {t('displaySettings.languageSettings.browserDefault')}
                      </option>
                      <option value="sunday">
                        {t('displaySettings.languageSettings.sunday')}
                      </option>
                      <option value="monday">
                        {t('displaySettings.languageSettings.monday')}
                      </option>
                      <option value="saturday">
                        {t('displaySettings.languageSettings.saturday')}
                      </option>
                    </select>
                  </label>
                </fieldset>
              </section>
            ) : showBookmarks ? (
              <section
                aria-labelledby="settings-bookmarks-title"
                key="bookmarks"
              >
                <div className="settings-dialog__section-heading">
                  <h2 id="settings-bookmarks-title">
                    {t('displaySettings.category.bookmarks')}
                  </h2>
                  <p>{t('displaySettings.bookmarkBehavior.description')}</p>
                </div>
                <fieldset>
                  <legend>
                    {t('displaySettings.bookmarkBehavior.saving')}
                  </legend>
                  <label>
                    <span>
                      {t('displaySettings.bookmarkBehavior.duplicates')}
                    </span>
                    <select
                      defaultValue={settings.duplicateHandling ?? 'allow'}
                      name="duplicateHandling"
                    >
                      <option value="allow">
                        {t('displaySettings.bookmarkBehavior.allow')}
                      </option>
                      <option value="warn">
                        {t('displaySettings.bookmarkBehavior.warn')}
                      </option>
                      <option value="prevent">
                        {t('displaySettings.bookmarkBehavior.prevent')}
                      </option>
                    </select>
                  </label>
                  <label>
                    <span>
                      {t('displaySettings.bookmarkBehavior.normalization')}
                    </span>
                    <select
                      defaultValue={settings.urlNormalization ?? 'ask'}
                      name="urlNormalization"
                    >
                      <option value="ask">
                        {t('displaySettings.bookmarkBehavior.ask')}
                      </option>
                      <option value="add">
                        {t('displaySettings.bookmarkBehavior.addHttps')}
                      </option>
                    </select>
                  </label>
                  <label>
                    <span>
                      {t('displaySettings.bookmarkBehavior.faviconDisplay')}
                    </span>
                    <select
                      defaultValue={settings.faviconDisplay ?? 'available'}
                      name="faviconDisplay"
                    >
                      <option value="available">
                        {t('displaySettings.bookmarkBehavior.available')}
                      </option>
                      <option value="initials">
                        {t('displaySettings.bookmarkBehavior.alwaysInitials')}
                      </option>
                    </select>
                  </label>
                  <label>
                    <span>
                      {t('displaySettings.bookmarkBehavior.missingFavicon')}
                    </span>
                    <select
                      defaultValue={settings.missingFavicon ?? 'initials'}
                      name="missingFavicon"
                    >
                      <option value="initials">
                        {t('displaySettings.bookmarkBehavior.initials')}
                      </option>
                      <option value="built-in">
                        {t('displaySettings.bookmarkBehavior.builtIn')}
                      </option>
                      <option value="none">
                        {t('displaySettings.bookmarkBehavior.noIcon')}
                      </option>
                    </select>
                  </label>
                  <label>
                    <span>
                      {t('displaySettings.bookmarkBehavior.folderIcon')}
                    </span>
                    <select
                      defaultValue={settings.folderIcon ?? 'initials'}
                      name="folderIcon"
                    >
                      <option value="initials">
                        {t('displaySettings.bookmarkBehavior.initials')}
                      </option>
                      <option value="none">
                        {t('displaySettings.bookmarkBehavior.noIcon')}
                      </option>
                    </select>
                  </label>
                  <label className="settings-checkbox-row">
                    <input
                      defaultChecked={settings.rememberLastAppearance ?? false}
                      name="rememberLastAppearance"
                      type="checkbox"
                    />
                    <span>
                      {t('displaySettings.bookmarkBehavior.rememberAppearance')}
                    </span>
                  </label>
                  <label>
                    <span>
                      {t('displaySettings.bookmarkBehavior.tagEntry')}
                    </span>
                    <select
                      defaultValue={settings.tagOrder ?? 'preserve'}
                      name="tagOrder"
                    >
                      <option value="preserve">
                        {t('displaySettings.bookmarkBehavior.preserve')}
                      </option>
                      <option value="alphabetical">
                        {t('displaySettings.bookmarkBehavior.alphabetical')}
                      </option>
                    </select>
                  </label>
                  <p className="settings-dialog__help">
                    {t('displaySettings.bookmarkBehavior.requiredSafety')}
                  </p>
                </fieldset>
                <fieldset>
                  <legend>
                    {t('displaySettings.bookmarkBehavior.dragging')}
                  </legend>
                  <label className="settings-checkbox-row">
                    <input
                      defaultChecked={settings.dragAndDropEnabled ?? true}
                      name="dragAndDropEnabled"
                      type="checkbox"
                    />
                    <span>{t('displaySettings.bookmarkBehavior.enable')}</span>
                  </label>
                  <label className="settings-checkbox-row">
                    <input
                      defaultChecked={settings.dropIntoFoldersEnabled ?? true}
                      name="dropIntoFoldersEnabled"
                      type="checkbox"
                    />
                    <span>
                      {t('displaySettings.bookmarkBehavior.dropIntoFolders')}
                    </span>
                  </label>
                  <label>
                    <span>
                      {t('displaySettings.bookmarkBehavior.hoverDelay')}
                    </span>
                    <select
                      defaultValue={String(
                        settings.folderDropHoverDelay ?? 600,
                      )}
                      name="folderDropHoverDelay"
                    >
                      <option value="400">
                        {t('displaySettings.bookmarkBehavior.short')}
                      </option>
                      <option value="600">
                        {t('displaySettings.bookmarkBehavior.standard')}
                      </option>
                      <option value="900">
                        {t('displaySettings.bookmarkBehavior.long')}
                      </option>
                    </select>
                  </label>
                  <label className="settings-checkbox-row">
                    <input
                      defaultChecked={settings.confirmFolderDrop ?? false}
                      name="confirmFolderDrop"
                      type="checkbox"
                    />
                    <span>{t('displaySettings.bookmarkBehavior.confirm')}</span>
                  </label>
                  <label>
                    <span>
                      {t('displaySettings.bookmarkBehavior.afterMove')}
                    </span>
                    <select
                      defaultValue={
                        settings.openFolderAfterDrop ? 'open' : 'stay'
                      }
                      name="afterMove"
                    >
                      <option value="stay">
                        {t('displaySettings.bookmarkBehavior.stay')}
                      </option>
                      <option value="open">
                        {t('displaySettings.bookmarkBehavior.open')}
                      </option>
                    </select>
                  </label>
                  <p className="settings-dialog__help">
                    {t('displaySettings.bookmarkBehavior.help')}
                  </p>
                </fieldset>
              </section>
            ) : showSearch ? (
              <section aria-labelledby="settings-search-title" key="search">
                <div className="settings-dialog__section-heading">
                  <h2 id="settings-search-title">
                    {t('displaySettings.category.search')}
                  </h2>
                  <p>{t('displaySettings.searchOptions.description')}</p>
                </div>
                <SearchOptions
                  className="settings-search-options"
                  onChange={setSearchPreferences}
                  preferences={searchPreferences}
                  profileCount={profiles.length}
                />
                <p className="settings-dialog__help">
                  {t('displaySettings.searchOptions.help')}
                </p>
              </section>
            ) : showNotifications ? (
              <section
                aria-labelledby="settings-notifications-title"
                key="notifications"
              >
                <div className="settings-dialog__section-heading">
                  <h2 id="settings-notifications-title">
                    {t('displaySettings.category.notifications')}
                  </h2>
                  <p>{t('displaySettings.notifications.description')}</p>
                </div>
                <fieldset>
                  <legend>{t('displaySettings.notifications.behavior')}</legend>
                  <label className="settings-checkbox-row">
                    <input
                      defaultChecked={
                        (
                          settings.notificationPreferences ??
                          defaultNotificationPreferences
                        ).enabled
                      }
                      name="notificationsEnabled"
                      type="checkbox"
                    />
                    <span>{t('displaySettings.notifications.enabled')}</span>
                  </label>
                  <label>
                    <span>{t('displaySettings.notifications.position')}</span>
                    <select
                      defaultValue={
                        (
                          settings.notificationPreferences ??
                          defaultNotificationPreferences
                        ).position
                      }
                      name="notificationPosition"
                    >
                      <option value="top-left">
                        {t('displaySettings.notifications.topLeft')}
                      </option>
                      <option value="top-right">
                        {t('displaySettings.notifications.topRight')}
                      </option>
                      <option value="bottom-left">
                        {t('displaySettings.notifications.bottomLeft')}
                      </option>
                      <option value="bottom-right">
                        {t('displaySettings.notifications.bottomRight')}
                      </option>
                    </select>
                  </label>
                  <label>
                    <span>{t('displaySettings.notifications.order')}</span>
                    <select
                      defaultValue={
                        (
                          settings.notificationPreferences ??
                          defaultNotificationPreferences
                        ).order
                      }
                      name="notificationOrder"
                    >
                      <option value="newest">
                        {t('displaySettings.notifications.newest')}
                      </option>
                      <option value="oldest">
                        {t('displaySettings.notifications.oldest')}
                      </option>
                    </select>
                  </label>
                  <label>
                    <span>{t('displaySettings.notifications.stackLimit')}</span>
                    <select
                      defaultValue={String(
                        (
                          settings.notificationPreferences ??
                          defaultNotificationPreferences
                        ).stackLimit,
                      )}
                      name="notificationStackLimit"
                    >
                      <option value="3">3</option>
                      <option value="6">6</option>
                      <option value="9">9</option>
                    </select>
                  </label>
                  <label className="settings-checkbox-row">
                    <input
                      checked={notificationLineUsesForeground}
                      name="notificationLineUsesForeground"
                      onChange={(event) =>
                        setNotificationLineUsesForeground(event.target.checked)
                      }
                      type="checkbox"
                    />
                    <span>
                      {t('displaySettings.notifications.useForegroundColor')}
                    </span>
                  </label>
                  <label>
                    <span>
                      {t('displaySettings.notifications.countdownLineColor')}
                    </span>
                    <input
                      disabled={notificationLineUsesForeground}
                      name="notificationLineColor"
                      onChange={(event) =>
                        setNotificationLineColor(event.target.value)
                      }
                      type="color"
                      value={notificationLineColor}
                    />
                  </label>
                  <p className="settings-dialog__help">
                    {t('displaySettings.notifications.orderHelp')}
                  </p>
                </fieldset>
              </section>
            ) : showActivity ? (
              <section aria-labelledby="settings-activity-title" key="activity">
                <div className="settings-dialog__section-heading">
                  <h2 id="settings-activity-title">
                    {t('displaySettings.category.activity')}
                  </h2>
                  <p>{t('displaySettings.activity.description')}</p>
                </div>
                <fieldset>
                  <legend>{t('displaySettings.activity.logging')}</legend>
                  <label className="settings-checkbox-row">
                    <input
                      defaultChecked={activityLogSettings.enabled}
                      name="activityLogEnabled"
                      type="checkbox"
                    />
                    <span>{t('displaySettings.activity.enabled')}</span>
                  </label>
                  <p className="settings-dialog__help">
                    {t('displaySettings.activity.help')}
                  </p>
                </fieldset>
              </section>
            ) : showBackup ? (
              <section aria-labelledby="settings-backup-title" key="backup">
                <div className="settings-dialog__section-heading">
                  <h2 id="settings-backup-title">
                    {t('displaySettings.category.backup')}
                  </h2>
                  <p>{t('displaySettings.backupSettings.localWarning')}</p>
                </div>
                <fieldset>
                  <legend>
                    {t('displaySettings.backupSettings.automatic')}
                  </legend>
                  <label className="settings-checkbox-row">
                    <input
                      defaultChecked={
                        (settings.backupPreferences ?? defaultBackupPreferences)
                          .automaticEnabled
                      }
                      name="backupAutomaticEnabled"
                      type="checkbox"
                    />
                    <span>{t('displaySettings.backupSettings.automatic')}</span>
                  </label>
                  <p className="settings-dialog__help">
                    {t('displaySettings.backupSettings.automaticHelp')}
                  </p>
                </fieldset>
                <fieldset>
                  <legend>{t('displaySettings.backupSettings.before')}</legend>
                  {(['Synchronization'] as const).map((trigger) => (
                    <label className="settings-checkbox-row" key={trigger}>
                      <input
                        defaultChecked={
                          (settings.backupPreferences ??
                            defaultBackupPreferences)[
                            `before${trigger}` as keyof typeof defaultBackupPreferences
                          ] as boolean
                        }
                        name={`backupBefore${trigger}`}
                        type="checkbox"
                      />
                      <span>
                        {t(`displaySettings.backupSettings.before${trigger}`)}
                      </span>
                    </label>
                  ))}
                  <label>
                    <span>{t('displaySettings.backupSettings.retention')}</span>
                    <select
                      defaultValue={
                        (settings.backupPreferences ?? defaultBackupPreferences)
                          .retentionPerTrigger
                      }
                      name="backupRetention"
                    >
                      {[3, 5, 10, 20].map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </label>
                </fieldset>
                <fieldset>
                  <legend>
                    {t('displaySettings.backupSettings.alwaysProtected')}
                  </legend>
                  <p className="settings-dialog__help">
                    {t('displaySettings.backupSettings.alwaysProtectedHelp')}
                  </p>
                </fieldset>
                <p className="settings-dialog__help">
                  {t('displaySettings.backupSettings.manageHelp')}
                </p>
              </section>
            ) : showSecurity ? (
              <section aria-labelledby="settings-security-title" key="security">
                <div className="settings-dialog__section-heading">
                  <h2 id="settings-security-title">
                    {t('displaySettings.category.security')}
                  </h2>
                  <p>{t('displaySettings.security.description')}</p>
                </div>
                <fieldset>
                  <legend>{t('displaySettings.security.navigation')}</legend>
                  <label className="settings-checkbox-row">
                    <input
                      defaultChecked={settings.confirmExternalLinks ?? false}
                      name="confirmExternalLinks"
                      type="checkbox"
                    />
                    <span>{t('displaySettings.security.confirmExternal')}</span>
                  </label>
                  <p className="settings-dialog__help">
                    {t('displaySettings.security.help')}
                  </p>
                </fieldset>
              </section>
            ) : showAccessibility ? (
              <section
                aria-labelledby="settings-accessibility-title"
                key="accessibility"
              >
                <div className="settings-dialog__section-heading">
                  <h2 id="settings-accessibility-title">
                    {t('displaySettings.category.accessibility')}
                  </h2>
                  <p>{t('displaySettings.accessibility.description')}</p>
                </div>
                <fieldset>
                  <legend>{t('displaySettings.accessibility.visual')}</legend>
                  <label>
                    <span>{t('displaySettings.accessibility.animations')}</span>
                    <select
                      defaultValue={settings.animationPreference ?? 'system'}
                      name="animationPreference"
                    >
                      <option value="system">
                        {t('displaySettings.accessibility.systemAnimations')}
                      </option>
                      <option value="reduced">
                        {t('displaySettings.accessibility.reducedAnimations')}
                      </option>
                      <option value="none">
                        {t('displaySettings.accessibility.noAnimations')}
                      </option>
                    </select>
                  </label>
                  <label className="settings-checkbox-row">
                    <input
                      defaultChecked={settings.highContrast ?? false}
                      name="highContrast"
                      type="checkbox"
                    />
                    <span>
                      {t('displaySettings.accessibility.highContrast')}
                    </span>
                  </label>
                  <p className="settings-dialog__help">
                    {t('displaySettings.accessibility.help')}
                  </p>
                </fieldset>
              </section>
            ) : showShortcuts ? (
              <ShortcutSettingsPanel
                onChange={setShortcutPreferences}
                preferences={shortcutPreferences}
              />
            ) : !hasResults ? (
              <div className="settings-dialog__content-empty">
                <h2>{t('displaySettings.noResults')}</h2>
                <p>
                  {t('displaySettings.noResultsHelp')}{' '}
                  <a
                    href={FEATURE_REQUEST_URL}
                    onClick={(event) => {
                      event.preventDefault();
                      onOpenExternalLink(FEATURE_REQUEST_URL);
                    }}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {t('displaySettings.suggestFeature')}
                  </a>
                </p>
              </div>
            ) : null}

            {error ? (
              <p className="content-editor__error" role="alert">
                {t('displaySettings.error')}
              </p>
            ) : null}
          </section>
        </div>

        <footer className="settings-dialog__actions">
          <button disabled={saving} onClick={onClose} type="button">
            {t('displaySettings.cancel')}
          </button>
          <button
            disabled={
              saving ||
              (!showGeneral &&
                !showAppearance &&
                !showProfiles &&
                !showLanguage &&
                !showActivity &&
                !showSecurity &&
                !showAccessibility &&
                !showShortcuts &&
                !showNotifications &&
                !showBookmarks &&
                !showSearch &&
                !showBackup)
            }
            type="submit"
          >
            {saving ? t('displaySettings.saving') : t('displaySettings.save')}
          </button>
        </footer>
      </form>
    </dialog>
  );
}
