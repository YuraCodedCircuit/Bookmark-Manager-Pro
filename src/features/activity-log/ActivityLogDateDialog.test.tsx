import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import '../../localization/i18n';
import { ActivityLogDateDialog } from './ActivityLogDateDialog';
import { localDay } from '../../domain/activity-log-dates';

afterEach(cleanup);
describe('activity date draft calendar', () => {
  it('marks only dates with matching records and retains their accessible activity description', () => {
    const day = new Date();
    day.setDate(5);
    render(
      <ActivityLogDateDialog
        selection={null}
        activityDays={new Set([localDay(day)])}
        onApply={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    const marked = screen.getByRole('button', {
      name: `${day.toLocaleDateString('en-US', { dateStyle: 'full' })}, Contains matching activity`,
    });
    expect(marked).toHaveTextContent(/^5$/);
    expect(marked.querySelector('.activity-date-marker')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
    const next = new Date(day);
    next.setDate(6);
    expect(
      screen
        .getByRole('button', {
          name: next.toLocaleDateString('en-US', { dateStyle: 'full' }),
        })
        .querySelector('.activity-date-marker'),
    ).toBeNull();
  });
  it('requires a nonempty custom draft and permits dates without events', async () => {
    const user = userEvent.setup();
    const apply = vi.fn();
    render(
      <ActivityLogDateDialog
        selection={null}
        activityDays={new Set()}
        onApply={apply}
        onClose={vi.fn()}
      />,
    );
    await user.selectOptions(screen.getByLabelText('Date preset'), 'custom');
    expect(screen.getByRole('button', { name: 'Apply' })).toBeDisabled();
    const day = new Date();
    day.setDate(5);
    const button = screen.getByRole('button', {
      name: day.toLocaleDateString('en-US', { dateStyle: 'full' }),
    });
    await user.click(button);
    expect(button).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: 'Apply' }));
    expect(apply).toHaveBeenCalledWith([
      { from: localDay(day), to: localDay(day) },
    ]);
  });
  it('merges overlapping ranges, requires two endpoints, and removes chips', async () => {
    const user = userEvent.setup();
    const apply = vi.fn();
    render(
      <ActivityLogDateDialog
        selection={[]}
        activityDays={new Set()}
        onApply={apply}
        onClose={vi.fn()}
      />,
    );
    const date = (number: number) => {
      const day = new Date();
      day.setDate(number);
      return day;
    };
    const pick = async (number: number) =>
      user.click(
        screen.getByRole('button', {
          name: date(number).toLocaleDateString('en-US', { dateStyle: 'full' }),
        }),
      );
    await user.click(screen.getByLabelText('Date ranges'));
    await pick(5);
    expect(screen.getByRole('button', { name: 'Apply' })).toBeDisabled();
    await pick(10);
    await pick(8);
    await pick(12);
    await user.click(screen.getByRole('button', { name: 'Apply' }));
    expect(apply).toHaveBeenCalledWith([
      { from: localDay(date(5)), to: localDay(date(12)) },
    ]);
    const remove = screen.getByRole('button', { name: /^Remove / });
    expect(remove).toHaveTextContent('');
    expect(remove.parentElement?.tagName).toBe('DIV');
    remove.focus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('button', { name: 'Apply' })).toBeDisabled();
    await waitFor(() =>
      expect(screen.getByLabelText('Date preset')).toHaveFocus(),
    );
  });
  it('clamps Page Down to the target month and keeps keyboard focus in the calendar', async () => {
    const user = userEvent.setup();
    render(
      <ActivityLogDateDialog
        selection={[]}
        activityDays={new Set()}
        onApply={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    const now = new Date();
    const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const grid = screen.getAllByRole('grid')[0]!;
    const button = within(grid).getByRole('button', {
      name: last.toLocaleDateString('en-US', { dateStyle: 'full' }),
    });
    button.focus();
    await user.keyboard('{PageDown}');
    const next = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      Math.min(
        last.getDate(),
        new Date(now.getFullYear(), now.getMonth() + 2, 0).getDate(),
      ),
    );
    expect(
      await screen.findByRole('button', {
        name: next.toLocaleDateString('en-US', { dateStyle: 'full' }),
      }),
    ).toHaveFocus();
  });
});
