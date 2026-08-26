import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import '../../localization/i18n';
import { defaultShortcutPreferences } from '../../domain/keyboard-shortcuts';
import { ShortcutSettingsPanel } from './ShortcutSettingsPanel';

afterEach(cleanup);

describe('ShortcutSettingsPanel', () => {
  it('records a valid binding and rejects a duplicate', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(
      <ShortcutSettingsPanel
        onChange={onChange}
        preferences={defaultShortcutPreferences}
      />,
    );
    const search = screen.getByRole('button', {
      name: 'Change shortcut for Search',
    });
    await user.click(search);
    fireEvent.keyDown(search, { altKey: true, key: 'k' });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        bindings: expect.objectContaining({ search: 'Alt+K' }),
      }),
    );

    rerender(
      <ShortcutSettingsPanel
        onChange={onChange}
        preferences={defaultShortcutPreferences}
      />,
    );
    const copy = screen.getByRole('button', {
      name: 'Change shortcut for Copy item',
    });
    await user.click(copy);
    fireEvent.keyDown(copy, { ctrlKey: true, key: 'f' });
    const message = screen.getByText(
      'This shortcut is already assigned to another action.',
    );
    expect(message).toBeVisible();
    expect(message.closest('td')).toHaveAttribute('colspan', '3');
    expect(message.closest('tr')).not.toBe(copy.closest('tr'));
  });

  it('shows global restore only for customized bindings', () => {
    const { rerender } = render(
      <ShortcutSettingsPanel
        onChange={vi.fn()}
        preferences={defaultShortcutPreferences}
      />,
    );
    expect(
      screen.queryByRole('button', { name: 'Restore all defaults' }),
    ).not.toBeInTheDocument();
    rerender(
      <ShortcutSettingsPanel
        onChange={vi.fn()}
        preferences={{
          ...defaultShortcutPreferences,
          bindings: {
            ...defaultShortcutPreferences.bindings,
            search: 'Alt+K',
          },
        }}
      />,
    );
    expect(
      screen.getByRole('button', { name: 'Restore all defaults' }),
    ).toBeVisible();
  });
});
