import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ContextMenuIcon, type ContextMenuIconName } from './ContextMenuIcon';

const iconNames: ContextMenuIconName[] = [
  'bookmark-add',
  'copy',
  'cut',
  'delete',
  'duplicate',
  'edit',
  'folder-add',
  'folder-style',
  'info',
  'open',
  'open-new',
  'paste',
  'pin',
  'search',
];

describe('ContextMenuIcon', () => {
  it.each(iconNames)('uses the shared square glyph frame for %s', (name) => {
    const { container } = render(<ContextMenuIcon name={name} />);
    const icon = container.querySelector('svg');

    expect(icon).toHaveAttribute('viewBox', '0 0 24 24');
    expect(icon).toHaveClass('context-menu__icon');
    expect(icon?.querySelector('[data-glyph-frame="square"]')).toBeTruthy();
  });
});
