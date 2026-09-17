import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import '../../localization/i18n';
import { PasswordGeneratorDialog } from './PasswordGeneratorDialog';

beforeEach(() => {
  document.documentElement.dataset.motion = 'none';
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  delete document.documentElement.dataset.motion;
});

describe('PasswordGeneratorDialog', () => {
  it('generates transient defaults and marks the result stale after an option changes', async () => {
    const user = userEvent.setup();
    const onCopy = vi.fn().mockResolvedValue(undefined);
    const onGenerated = vi.fn();
    render(
      <PasswordGeneratorDialog
        isOpen
        onClose={vi.fn()}
        onCopy={onCopy}
        onFailure={vi.fn()}
        onGenerated={onGenerated}
        onValidationFailure={vi.fn()}
      />,
    );

    const output = screen.getByRole('textbox', { name: 'Generated password' });
    await waitFor(() => expect(output).toHaveTextContent(/^.{16}$/u));
    expect(onGenerated).not.toHaveBeenCalled();
    expect(screen.getByRole('radio', { name: 'Safe' })).toBeChecked();
    expect(
      screen.getByRole('checkbox', { name: 'Exclude ambiguous characters' }),
    ).toBeChecked();
    const copy = screen.getByRole('button', { name: 'Copy password' });
    await waitFor(() => expect(copy).toHaveFocus());

    await user.click(screen.getByRole('checkbox', { name: 'Numbers' }));
    expect(copy).toBeDisabled();
    expect(
      screen.getByText('Options changed. Generate a new password to copy it.'),
    ).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Generate' }));
    expect(copy).toBeEnabled();
    expect(onGenerated).toHaveBeenCalledOnce();
    await user.click(copy);
    expect(onCopy).toHaveBeenCalledWith(expect.stringMatching(/^.{16}$/u));
  });

  it('keeps one base group selected and reports invalid length attempts', async () => {
    const user = userEvent.setup();
    const onValidationFailure = vi.fn();
    render(
      <PasswordGeneratorDialog
        isOpen
        onClose={vi.fn()}
        onCopy={vi.fn().mockResolvedValue(undefined)}
        onFailure={vi.fn()}
        onGenerated={vi.fn()}
        onValidationFailure={onValidationFailure}
      />,
    );

    await user.click(screen.getByRole('checkbox', { name: 'Uppercase' }));
    await user.click(screen.getByRole('checkbox', { name: 'Numbers' }));
    expect(screen.getByRole('checkbox', { name: 'Lowercase' })).toBeDisabled();
    await user.click(screen.getByRole('radio', { name: 'None' }));

    const length = screen.getByRole('spinbutton', { name: 'Password length' });
    fireEvent.change(length, { target: { value: '1' } });
    expect(screen.getByRole('button', { name: 'Generate' })).toBeEnabled();

    await user.click(screen.getByRole('radio', { name: 'All' }));
    const generate = screen.getByRole('button', { name: 'Generate' });
    expect(generate).toBeEnabled();
    expect(
      screen.getByText(
        'Choose at least 2 characters for the selected character sets.',
      ),
    ).toBeVisible();
    await user.click(generate);
    expect(onValidationFailure).toHaveBeenCalledWith(2);
  });

  it('reports clipboard failures without exposing the generated password', async () => {
    const user = userEvent.setup();
    const onFailure = vi.fn();
    render(
      <PasswordGeneratorDialog
        isOpen
        onClose={vi.fn()}
        onCopy={vi.fn().mockRejectedValue(new Error('denied'))}
        onFailure={onFailure}
        onGenerated={vi.fn()}
        onValidationFailure={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Copy password' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The password could not be copied. Try again.',
    );
    expect(onFailure).toHaveBeenCalledWith('clipboard');
  });

  it('clears transient state when Cancel closes the window', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { rerender } = render(
      <PasswordGeneratorDialog
        isOpen
        onClose={onClose}
        onCopy={vi.fn().mockResolvedValue(undefined)}
        onFailure={vi.fn()}
        onGenerated={vi.fn()}
        onValidationFailure={vi.fn()}
      />,
    );

    const output = screen.getByRole('textbox', { name: 'Generated password' });
    await waitFor(() => expect(output).not.toHaveTextContent(/^$/u));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledOnce();

    rerender(
      <PasswordGeneratorDialog
        isOpen={false}
        onClose={onClose}
        onCopy={vi.fn().mockResolvedValue(undefined)}
        onFailure={vi.fn()}
        onGenerated={vi.fn()}
        onValidationFailure={vi.fn()}
      />,
    );
    expect(output).toHaveTextContent(/^$/u);
  });

  it('reveals a new password progressively and prevents copying until it completes', async () => {
    document.documentElement.dataset.motion = 'reduced';
    const user = userEvent.setup();
    render(
      <PasswordGeneratorDialog
        isOpen
        onClose={vi.fn()}
        onCopy={vi.fn().mockResolvedValue(undefined)}
        onFailure={vi.fn()}
        onGenerated={vi.fn()}
        onValidationFailure={vi.fn()}
      />,
    );

    const output = screen.getByRole('textbox', { name: 'Generated password' });
    const copy = screen.getByRole('button', { name: 'Copy password' });
    await waitFor(() => expect(output).toHaveTextContent(/^.{16}$/u));
    const firstFrame = output.textContent;
    expect(copy).toBeDisabled();
    await waitFor(() => expect(output.textContent).not.toBe(firstFrame));
    await waitFor(() => expect(copy).toBeEnabled());

    await user.click(screen.getByRole('button', { name: 'Generate' }));
    expect(copy).toBeDisabled();
    await waitFor(() => expect(copy).toBeEnabled());
  });

  it('reports generation failures without displaying a partial value', async () => {
    const getRandomValues = vi
      .spyOn(globalThis.crypto, 'getRandomValues')
      .mockImplementation(() => {
        throw new Error('random source unavailable');
      });
    const onFailure = vi.fn();
    render(
      <PasswordGeneratorDialog
        isOpen
        onClose={vi.fn()}
        onCopy={vi.fn().mockResolvedValue(undefined)}
        onFailure={onFailure}
        onGenerated={vi.fn()}
        onValidationFailure={vi.fn()}
      />,
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The password could not be generated. Try again.',
    );
    expect(onFailure).toHaveBeenCalledWith('generation');
    expect(
      screen.getByRole('textbox', { name: 'Generated password' }),
    ).toHaveTextContent(/^$/u);
    getRandomValues.mockRestore();
  });
});
