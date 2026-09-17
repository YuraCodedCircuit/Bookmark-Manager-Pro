export const passwordLengthLimits = { maximum: 50, minimum: 1 } as const;

export type PasswordSymbolSet = 'all' | 'none' | 'safe';

export interface PasswordGeneratorOptions {
  excludeAmbiguous: boolean;
  length: number;
  lowercase: boolean;
  numbers: boolean;
  symbolSet: PasswordSymbolSet;
  uppercase: boolean;
}

export type PasswordStrengthLabel =
  'fair' | 'moderate' | 'strong' | 'veryStrong' | 'weak';

export interface PasswordStrength {
  color: string;
  label: PasswordStrengthLabel;
  value: number;
}

export const defaultPasswordGeneratorOptions: PasswordGeneratorOptions = {
  excludeAmbiguous: true,
  length: 16,
  lowercase: true,
  numbers: true,
  symbolSet: 'safe',
  uppercase: true,
};

const lowercaseCharacters = 'abcdefghijklmnopqrstuvwxyz';
const uppercaseCharacters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const numberCharacters = '0123456789';
const allSymbolCharacters = '!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~';
const safeSymbolCharacters = '!@#$%^&*-_=+?';
const ambiguousCharacters = new Set('lIO01B8S5Z2');

const strengthPresentation: Record<
  PasswordStrengthLabel,
  Pick<PasswordStrength, 'color' | 'value'>
> = {
  weak: { color: '#d32f2f', value: 20 },
  fair: { color: '#f57c00', value: 40 },
  moderate: { color: '#fbc02d', value: 60 },
  strong: { color: '#7cb342', value: 80 },
  veryStrong: { color: '#2e7d32', value: 100 },
};

export class PasswordGeneratorError extends Error {
  constructor(
    readonly code:
      | 'character-groups-required'
      | 'length-invalid'
      | 'length-too-short'
      | 'random-source-unavailable',
  ) {
    super(code);
    this.name = 'PasswordGeneratorError';
  }
}

/**
 * Generates a password from bounded character groups with unbiased Web Crypto
 * sampling. At least one character from every enabled group is included.
 */
export function generateRandomPassword(
  options: PasswordGeneratorOptions,
  fillRandomValues: (target: Uint8Array) => void = fillWithWebCrypto,
): string {
  const groups = getCharacterGroups(options);
  validateLength(options.length, groups.length);
  const pool = groups.join('');
  const characters = groups.map(
    (group) => group[randomIndex(group.length, fillRandomValues)]!,
  );

  while (characters.length < options.length)
    characters.push(pool[randomIndex(pool.length, fillRandomValues)]!);

  for (let index = characters.length - 1; index > 0; index -= 1) {
    const swapIndex = randomIndex(index + 1, fillRandomValues);
    const currentCharacter = characters[index]!;
    characters[index] = characters[swapIndex]!;
    characters[swapIndex] = currentCharacter;
  }
  return characters.join('');
}

/** Returns the reference strength category for the password's actual content. */
export function evaluatePasswordStrength(password: string): PasswordStrength {
  if (!password)
    return { label: 'weak', color: strengthPresentation.weak.color, value: 0 };
  const label = getStrengthLabel(password);
  return { label, ...strengthPresentation[label] };
}

export function countRequiredCharacterGroups(
  options: PasswordGeneratorOptions,
): number {
  return getCharacterGroups(options).length;
}

function fillWithWebCrypto(target: Uint8Array): void {
  if (!globalThis.crypto?.getRandomValues)
    throw new PasswordGeneratorError('random-source-unavailable');
  globalThis.crypto.getRandomValues(target);
}

function randomIndex(
  length: number,
  fillRandomValues: (target: Uint8Array) => void,
): number {
  const maximumAcceptedByte = Math.floor(256 / length) * length;
  const randomByte = new Uint8Array(1);
  do {
    fillRandomValues(randomByte);
  } while (randomByte[0]! >= maximumAcceptedByte);
  return randomByte[0]! % length;
}

function getCharacterGroups(options: PasswordGeneratorOptions): string[] {
  const groups: string[] = [];
  if (options.lowercase)
    groups.push(filterAmbiguous(lowercaseCharacters, options.excludeAmbiguous));
  if (options.numbers)
    groups.push(filterAmbiguous(numberCharacters, options.excludeAmbiguous));
  if (options.symbolSet !== 'none')
    groups.push(
      options.symbolSet === 'safe' ? safeSymbolCharacters : allSymbolCharacters,
    );
  if (options.uppercase)
    groups.push(filterAmbiguous(uppercaseCharacters, options.excludeAmbiguous));
  if (groups.length === 0)
    throw new PasswordGeneratorError('character-groups-required');
  return groups;
}

function filterAmbiguous(characters: string, shouldFilter: boolean): string {
  return shouldFilter
    ? [...characters]
        .filter((character) => !ambiguousCharacters.has(character))
        .join('')
    : characters;
}

function validateLength(length: number, requiredGroups: number): void {
  if (
    !Number.isInteger(length) ||
    length < passwordLengthLimits.minimum ||
    length > passwordLengthLimits.maximum
  )
    throw new PasswordGeneratorError('length-invalid');
  if (length < requiredGroups)
    throw new PasswordGeneratorError('length-too-short');
}

function getStrengthLabel(password: string): PasswordStrengthLabel {
  if (!password) return 'weak';
  const hasNumbers = /[0-9]/u.test(password);
  const hasLowercase = /[a-z]/u.test(password);
  const hasUppercase = /[A-Z]/u.test(password);
  const hasLetters = hasLowercase || hasUppercase;
  const hasSymbols = /[^A-Za-z0-9]/u.test(password);
  const length = password.length;

  if (hasSymbols) return strengthByMinimum(length, [6, 9, 13, 17]);
  if (hasNumbers && !hasLetters) {
    if (length < 10) return 'weak';
    if (length < 13) return 'fair';
    if (length < 20) return 'moderate';
    return 'strong';
  }
  if (hasLetters && !hasNumbers) {
    if (hasLowercase && hasUppercase)
      return strengthByMinimum(length, [8, 11, 15, 19]);
    return strengthByMinimum(length, [9, 12, 16, 20]);
  }
  return strengthByMinimum(length, [7, 10, 14, 18]);
}

function strengthByMinimum(
  length: number,
  [fair, moderate, strong, veryStrong]: readonly [
    number,
    number,
    number,
    number,
  ],
): PasswordStrengthLabel {
  if (length < fair) return 'weak';
  if (length < moderate) return 'fair';
  if (length < strong) return 'moderate';
  if (length < veryStrong) return 'strong';
  return 'veryStrong';
}
