import { describe, expect, it } from 'vitest';
import {
  defaultImportPreferences,
  importPreferencesSchema,
  profileSettingsSchema,
} from './profile-settings';

describe('Import preferences', () => {
  it('defaults every option off and retains compatibility with settings that omit the category', () => {
    expect(importPreferencesSchema.parse({})).toEqual({
      autoOpenReview: false,
      rememberDestination: false,
      closeAfterSuccess: false,
      rememberedFolders: {},
    });
    const settings = profileSettingsSchema.parse({
      profileId: '11111111-1111-4111-8111-111111111111',
      theme: 'dark',
    });
    expect(settings.importPreferences ?? defaultImportPreferences).toEqual(
      importPreferencesSchema.parse({}),
    );
  });
  it('accepts only existing-app identifier shapes in remembered destinations, never file paths', () => {
    expect(() =>
      importPreferencesSchema.parse({
        rememberedFolders: {
          '11111111-1111-4111-8111-111111111111': 'D:/source/file.html',
        },
      }),
    ).toThrow();
    expect(() =>
      importPreferencesSchema.parse({
        rememberedFolders: {
          'D:/source/file.html': '22222222-2222-4222-8222-222222222222',
        },
      }),
    ).toThrow();
  });
});
