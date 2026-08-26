const DEFAULT_LANGUAGE = 'en-US';

/** Converts browser language variants into a stable comparison key. */
function normalizeLanguage(language: string): string {
  return language.trim().replace('_', '-').toLowerCase();
}

/**
 * Selects the application language in product-priority order: a supported
 * profile override, the browser's ordered preferences, and finally `en-US`.
 * A base-language match permits a translation such as `fr-CA` to serve `fr-FR`.
 */
export function resolveLanguage(
  browserLanguages: readonly string[],
  supportedLanguages: readonly string[],
  profileLanguage?: string,
): string {
  const supportedByNormalizedLanguage = new Map(
    supportedLanguages.map((language) => [
      normalizeLanguage(language),
      language,
    ]),
  );

  if (profileLanguage !== undefined) {
    const supportedProfileLanguage = supportedByNormalizedLanguage.get(
      normalizeLanguage(profileLanguage),
    );
    if (supportedProfileLanguage !== undefined) {
      return supportedProfileLanguage;
    }
  }

  for (const browserLanguage of browserLanguages) {
    const normalizedBrowserLanguage = normalizeLanguage(browserLanguage);
    const exactMatch = supportedByNormalizedLanguage.get(
      normalizedBrowserLanguage,
    );
    if (exactMatch !== undefined) {
      return exactMatch;
    }

    const baseLanguage = normalizedBrowserLanguage.split('-')[0];
    const baseMatch = supportedLanguages.find(
      (language) => normalizeLanguage(language).split('-')[0] === baseLanguage,
    );
    if (baseMatch !== undefined) {
      return baseMatch;
    }
  }

  return (
    supportedByNormalizedLanguage.get(normalizeLanguage(DEFAULT_LANGUAGE)) ??
    DEFAULT_LANGUAGE
  );
}
