import type { TFunction } from 'i18next';

import {
  settingsCategories,
  type SettingsCategory,
} from './settings-categories';

const APPEARANCE_KEYS = [
  'appearanceDescription',
  'appearance',
  'theme',
  'systemTheme',
  'darkTheme',
  'lightTheme',
  'accentColor',
  'defaultAccent',
  'customAccent',
  'customColor',
  'scrollbars',
  'systemScrollbars',
  'alwaysVisible',
  'whileScrolling',
  'bookmarkDisplay',
  'view',
  'card',
  'list',
  'details',
  'size',
  'small',
  'medium',
  'large',
  'spacing',
  'compact',
  'comfortable',
  'spacious',
  'sortBy',
  'manualOrder',
  'itemTitle',
  'dateCreated',
  'dateModified',
  'domain',
  'direction',
  'ascending',
  'descending',
  'groupBy',
  'none',
  'type',
  'sortHelp',
  'displayHelp',
] as const;

const CATEGORY_RESOURCE_KEYS: Partial<
  Record<SettingsCategory, readonly string[]>
> = {
  accessibility: ['displaySettings.accessibility'],
  activity: ['displaySettings.activity'],
  appearance: APPEARANCE_KEYS.map((key) => `displaySettings.${key}`),
  bookmarks: ['displaySettings.bookmarkBehavior'],
  general: ['displaySettings.generalDescription', 'displaySettings.general'],
  language: ['displaySettings.languageSettings'],
  notifications: ['displaySettings.notifications'],
  profiles: ['displaySettings.profiles'],
  search: ['displaySettings.searchOptions', 'searchWindow.options'],
  security: ['displaySettings.security'],
  shortcuts: ['displaySettings.shortcuts'],
};

const HIGHLIGHT_NAME = 'settings-search-match';

/** Returns categories whose localized labels or content contain the query. */
export function getSettingsCategoryMatches(
  t: TFunction,
  query: string,
): ReadonlySet<SettingsCategory> {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return new Set(settingsCategories);

  return new Set(
    settingsCategories.filter((category) =>
      getCategoryText(t, category).some((value) =>
        normalize(value).includes(normalizedQuery),
      ),
    ),
  );
}

/** Highlights visible settings text without changing native control values. */
export function highlightSettingsMatches(
  root: HTMLElement,
  query: string,
): () => void {
  const registry = typeof CSS === 'undefined' ? undefined : CSS.highlights;
  registry?.delete(HIGHLIGHT_NAME);
  clearChoiceHighlights(root);
  const normalizedQuery = normalize(query);
  if (!normalizedQuery)
    return () => {
      registry?.delete(HIGHLIGHT_NAME);
      clearChoiceHighlights(root);
    };

  const ranges: Range[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      return node.parentElement?.closest('option')
        ? NodeFilter.FILTER_REJECT
        : NodeFilter.FILTER_ACCEPT;
    },
  });
  let node = walker.nextNode();
  while (node) {
    const value = node.textContent ?? '';
    const normalizedValue = foldCase(value);
    let index = normalizedValue.indexOf(normalizedQuery);
    while (index >= 0) {
      const range = document.createRange();
      range.setStart(node, index);
      range.setEnd(node, index + normalizedQuery.length);
      ranges.push(range);
      index = normalizedValue.indexOf(
        normalizedQuery,
        index + normalizedQuery.length,
      );
    }
    node = walker.nextNode();
  }
  if (registry && ranges.length && typeof Highlight !== 'undefined')
    registry.set(HIGHLIGHT_NAME, new Highlight(...ranges));

  for (const select of root.querySelectorAll('select')) {
    const selectedText = select.selectedOptions.item(0)?.textContent ?? '';
    if (!foldCase(selectedText).includes(normalizedQuery)) continue;
    select.dataset.settingsChoiceHighlight = 'true';
    const overlay = document.createElement('span');
    overlay.ariaHidden = 'true';
    overlay.className = 'settings-dialog__choice-highlight';
    appendHighlightedText(overlay, selectedText, normalizedQuery);
    select.insertAdjacentElement('afterend', overlay);
  }

  return () => {
    registry?.delete(HIGHLIGHT_NAME);
    clearChoiceHighlights(root);
  };
}

function appendHighlightedText(
  container: HTMLElement,
  value: string,
  normalizedQuery: string,
): void {
  const normalizedValue = foldCase(value);
  let cursor = 0;
  let index = normalizedValue.indexOf(normalizedQuery);
  while (index >= 0) {
    container.append(value.slice(cursor, index));
    const mark = document.createElement('mark');
    mark.textContent = value.slice(index, index + normalizedQuery.length);
    container.append(mark);
    cursor = index + normalizedQuery.length;
    index = normalizedValue.indexOf(normalizedQuery, cursor);
  }
  container.append(value.slice(cursor));
}

function clearChoiceHighlights(root: HTMLElement): void {
  for (const select of root.querySelectorAll<HTMLSelectElement>(
    '[data-settings-choice-highlight]',
  ))
    delete select.dataset.settingsChoiceHighlight;
  for (const overlay of root.querySelectorAll(
    '.settings-dialog__choice-highlight',
  ))
    overlay.remove();
}

function getCategoryText(t: TFunction, category: SettingsCategory): string[] {
  const values = [t(`displaySettings.category.${category}`)];
  for (const key of CATEGORY_RESOURCE_KEYS[category] ?? []) {
    values.push(...collectStrings(t(key, { returnObjects: true })));
  }
  return values;
}

function collectStrings(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(collectStrings);
  if (value && typeof value === 'object')
    return Object.values(value).flatMap(collectStrings);
  return [];
}

function normalize(value: string): string {
  return foldCase(value).trim();
}

function foldCase(value: string): string {
  return value.toLocaleLowerCase();
}
