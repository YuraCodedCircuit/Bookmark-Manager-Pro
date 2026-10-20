import { describe, expect, it } from 'vitest';
import {
  csvColumns,
  exportPreferencesSchema,
  getCsvExportColumns,
} from './csv-export';
import { profileSettingsSchema } from './profile-settings';

describe('CSV export preferences', () => {
  it('preserves default exports for existing settings without adding serialized fields', () => {
    const settings = profileSettingsSchema.parse({
      profileId: '11111111-1111-4111-8111-111111111111',
      theme: 'dark',
    });
    expect(settings.exportPreferences).toBeUndefined();
    expect(getCsvExportColumns(settings.exportPreferences)).toEqual(csvColumns);
  });
  it('retains only enabled fields in the chosen order and rejects invalid configurations', () => {
    expect(
      getCsvExportColumns({
        csvColumnOrder: [
          'url',
          'title',
          'note',
          'tags',
          'profile',
          'profileId',
          'folderPath',
        ],
        csvEnabledColumns: ['title', 'url'],
      }),
    ).toEqual(['url', 'title']);
    for (const value of [
      { csvColumnOrder: [...csvColumns], csvEnabledColumns: [] },
      { csvColumnOrder: [...csvColumns], csvEnabledColumns: ['title'] },
      { csvColumnOrder: [...csvColumns], csvEnabledColumns: ['url', 'url'] },
      { csvColumnOrder: Array(7).fill('url'), csvEnabledColumns: ['url'] },
      {
        csvColumnOrder: [...csvColumns],
        csvEnabledColumns: ['url', 'untrusted'],
      },
    ])
      expect(() => exportPreferencesSchema.parse(value)).toThrow();
  });
});
