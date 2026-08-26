import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import '../../localization/i18n';
import { TopNavigation } from './TopNavigation';

afterEach(cleanup);

describe('TopNavigation', () => {
  it('keeps Home outside the horizontally scrollable descendant path', () => {
    const onNavigate = vi.fn();
    render(
      <TopNavigation
        onNavigate={onNavigate}
        onOpenProfile={vi.fn()}
        onOpenTree={vi.fn()}
        path={['Home', 'Projects', 'Deep folder', 'Current folder']}
        pathSeparator="/"
        profile={undefined}
        profileButtonRef={{ current: null }}
        treeButtonRef={{ current: null }}
      />,
    );

    const breadcrumb = screen.getByRole('navigation', {
      name: 'Current folder path',
    });
    const home = within(breadcrumb).getByRole('button', { name: 'Home' });
    const path = breadcrumb.querySelector('.breadcrumb__path');

    expect(home).toHaveClass('breadcrumb__home');
    expect(path).not.toContainElement(home);
    expect(path).toHaveTextContent('Projects/Deep folder/Current folder');

    fireEvent.click(home);
    expect(onNavigate).toHaveBeenCalledWith(0);
  });
});
