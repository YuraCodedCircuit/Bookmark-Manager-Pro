import { describe, expect, it } from 'vitest';

import { resolveLanguage } from './resolve-language';

describe('resolveLanguage', () => {
  it('uses an exact supported browser language', () => {
    expect(resolveLanguage(['fr-CA'], ['en-US', 'fr-CA'])).toBe('fr-CA');
  });

  it('uses a supported regional variant for a matching base language', () => {
    expect(resolveLanguage(['fr-FR'], ['en-US', 'fr-CA'])).toBe('fr-CA');
  });

  it('falls back to American English for an unsupported browser language', () => {
    expect(resolveLanguage(['uk-UA'], ['en-US'])).toBe('en-US');
  });

  it('prefers a supported active-profile language', () => {
    expect(resolveLanguage(['en-US'], ['en-US', 'fr-CA'], 'fr-CA')).toBe(
      'fr-CA',
    );
  });
});
