import { describe, expect, it } from 'vitest';

import { getPublishedVersionSection } from './changelog-sections';

describe('getPublishedVersionSection', () => {
  const changelog = `# Changelog

## Unreleased

- Future work.

## 1.2.0 - 2026-09-08

- Current release.

## 1.1.0 - 2026-08-24

- Older release.
`;

  it('returns only the exact dated release section', () => {
    expect(getPublishedVersionSection(changelog, '1.2.0')).toBe(
      '## 1.2.0 - 2026-09-08\n\n- Current release.',
    );
  });

  it('rejects missing and duplicate version sections', () => {
    expect(getPublishedVersionSection(changelog, '2.0.0')).toBeNull();
    expect(
      getPublishedVersionSection(
        `${changelog}\n## 1.2.0 - 2026-09-09\n\n- Duplicate.`,
        '1.2.0',
      ),
    ).toBeNull();
  });
});
