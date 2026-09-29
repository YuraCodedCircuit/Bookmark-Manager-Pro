import { describe, expect, it } from 'vitest';

import { titleInitials } from './title-initials';

describe('titleInitials', () => {
  it.each([
    ['Git', 'GI'],
    ['GitHub', 'GH'],
    ['Git Hub', 'GH'],
    ['Git-Hub', 'GH'],
    ['Git_Hub', 'GH'],
    ['Git.Hub', 'GH'],
    ['Git/Hub', 'GH'],
    ['3D Printing', '3P'],
    ['The Git Hub', 'TG'],
    ['\u2b50 GitHub', 'GH'],
    ['\u00c9cole Libre', '\u00c9L'],
    ['\u6771\u4eac', '\u6771\u4eac'],
    ['\u041c\u043e\u0439\u041c\u0438\u0440', '\u041c\u041c'],
    ['\u00df Test', 'ST'],
    ['X', 'X'],
  ])('derives %s as %s', (title, expected) => {
    expect(titleInitials(title, 'bookmark')).toBe(expected);
  });

  it('uses content-specific fallbacks when no letters or numbers remain', () => {
    expect(titleInitials('  \u2b50 -- ', 'bookmark')).toBe('BO');
    expect(titleInitials('  \u2b50 -- ', 'folder')).toBe('FO');
  });
});
