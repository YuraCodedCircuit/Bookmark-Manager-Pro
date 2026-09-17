import { describe, expect, it } from 'vitest';

import {
  defaultPasswordGeneratorOptions,
  evaluatePasswordStrength,
  generateRandomPassword,
  PasswordGeneratorError,
} from './password-generator';

function deterministicRandom(...bytes: number[]) {
  let index = 0;
  return (target: Uint8Array) => {
    target[0] = bytes[index % bytes.length] ?? 0;
    index += 1;
  };
}

describe('generateRandomPassword', () => {
  it('uses the requested length and guarantees every selected group', () => {
    const password = generateRandomPassword(
      defaultPasswordGeneratorOptions,
      deterministicRandom(0, 1, 2, 3, 4, 5, 6, 7),
    );

    expect(password).toHaveLength(16);
    expect(password).toMatch(/[a-z]/u);
    expect(password).toMatch(/[A-Z]/u);
    expect(password).toMatch(/[0-9]/u);
    expect(password).toMatch(/[!@#$%^&*\-_=+?]/u);
    expect(password).not.toMatch(/[lIO01B8S5Z2]/u);
  });

  it('rejects missing base groups and lengths too short for selected groups', () => {
    expect(() =>
      generateRandomPassword(
        {
          ...defaultPasswordGeneratorOptions,
          lowercase: false,
          numbers: false,
          symbolSet: 'none',
          uppercase: false,
        },
        deterministicRandom(0),
      ),
    ).toThrowError(new PasswordGeneratorError('character-groups-required'));
    expect(() =>
      generateRandomPassword(
        { ...defaultPasswordGeneratorOptions, length: 3 },
        deterministicRandom(0),
      ),
    ).toThrowError(new PasswordGeneratorError('length-too-short'));
  });

  it('rejects bytes outside the unbiased sampling range', () => {
    const password = generateRandomPassword(
      {
        ...defaultPasswordGeneratorOptions,
        length: 1,
        numbers: false,
        symbolSet: 'none',
        uppercase: false,
      },
      deterministicRandom(255, 0),
    );

    expect(password).toBe('a');
  });
});

describe('evaluatePasswordStrength', () => {
  it('returns an empty zero-value state before a password exists', () => {
    expect(evaluatePasswordStrength('')).toMatchObject({
      label: 'weak',
      value: 0,
    });
  });

  it.each([
    ['123456789', 'weak', 20],
    ['1234567890', 'fair', 40],
    ['lowercaseonly', 'moderate', 60],
    ['MixedCaseLength', 'strong', 80],
    ['MixedCaseAnd12Nums', 'veryStrong', 100],
    ['with-symbol!', 'moderate', 60],
  ] as const)('classifies %s as %s', (password, label, value) => {
    expect(evaluatePasswordStrength(password)).toMatchObject({ label, value });
  });
});
