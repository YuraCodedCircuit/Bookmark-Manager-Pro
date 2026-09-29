export type TitleInitialsKind = 'bookmark' | 'folder';

const fallbackInitials: Record<TitleInitialsKind, string> = {
  bookmark: 'BO',
  folder: 'FO',
};

const titleWordPattern = /[\p{L}\p{M}\p{N}]+/gu;
const uppercaseLetterPattern = /\p{Lu}/u;
const graphemeSegmenter = new Intl.Segmenter(undefined, {
  granularity: 'grapheme',
});

function graphemes(value: string): string[] {
  return Array.from(graphemeSegmenter.segment(value), ({ segment }) => segment);
}

function uppercaseInitials(characters: string[]): string {
  return characters
    .map((character) => graphemes(character.toUpperCase())[0] ?? '')
    .join('');
}

/**
 * Returns a two-character decorative label from a bookmark or folder title.
 * Symbols are ignored, punctuation separates words, and grapheme segmentation
 * keeps Unicode letters intact. Empty titles use the content-kind fallback.
 */
export function titleInitials(title: string, kind: TitleInitialsKind): string {
  const words = title.normalize('NFC').match(titleWordPattern) ?? [];
  if (words.length === 0) return fallbackInitials[kind];

  if (words.length > 1) {
    return uppercaseInitials(
      words.slice(0, 2).map((word) => graphemes(word)[0] ?? ''),
    );
  }

  const characters = graphemes(words[0] ?? '');
  const uppercaseCharacters = characters.filter((character) =>
    uppercaseLetterPattern.test(character),
  );
  const selected =
    uppercaseCharacters.length >= 2
      ? uppercaseCharacters.slice(0, 2)
      : characters.slice(0, 2);

  return uppercaseInitials(selected) || fallbackInitials[kind];
}
