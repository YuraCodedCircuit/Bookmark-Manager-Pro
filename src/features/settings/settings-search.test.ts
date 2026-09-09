import { afterEach, describe, expect, it, vi } from 'vitest';

import { i18n } from '../../localization/i18n';
import {
  getSettingsCategoryMatches,
  highlightSettingsMatches,
} from './settings-search';

afterEach(() => vi.unstubAllGlobals());

describe('settings search', () => {
  it('matches localized category content and native option labels', () => {
    const matches = getSettingsCategoryMatches(
      i18n.t.bind(i18n),
      'show a saved favicon when available',
    );

    expect([...matches]).toEqual(['bookmarks']);
  });

  it('registers ranges for every visible text match and excludes option text', () => {
    const set = vi.fn();
    const remove = vi.fn();
    vi.stubGlobal('CSS', { highlights: { delete: remove, set } });
    vi.stubGlobal(
      'Highlight',
      class {
        constructor(...ranges: Range[]) {
          expect(ranges).toHaveLength(2);
        }
      },
    );
    const root = document.createElement('section');
    root.innerHTML =
      '<p>Bookmark display includes bookmark cards.</p><select><option>Bookmark option</option></select>';

    const cleanup = highlightSettingsMatches(root, 'bookmark');

    expect(set).toHaveBeenCalledOnce();
    expect(set).toHaveBeenCalledWith(
      'settings-search-match',
      expect.anything(),
    );
    expect(root.querySelector('select')).toHaveAttribute(
      'data-settings-choice-highlight',
      'true',
    );
    expect(
      root.querySelector('.settings-dialog__choice-highlight mark'),
    ).toHaveTextContent('Bookmark');
    cleanup();
    expect(remove).toHaveBeenLastCalledWith('settings-search-match');
    expect(
      root.querySelector('.settings-dialog__choice-highlight'),
    ).not.toBeInTheDocument();
  });
});
