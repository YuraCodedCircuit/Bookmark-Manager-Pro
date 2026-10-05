import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { useState } from 'react';

import '../localization/i18n';
import { ClearableInput } from './ClearableInput';

afterEach(cleanup);

function ControlledInput() {
  const [value, setValue] = useState('');
  return (
    <ClearableInput
      aria-label="Title"
      onChange={(event) => setValue(event.currentTarget.value)}
      value={value}
    />
  );
}

describe('ClearableInput', () => {
  it('shows its clear action only while an editable field has content', async () => {
    const user = userEvent.setup();
    render(<ControlledInput />);

    const input = screen.getByRole('textbox', { name: 'Title' });
    expect(
      screen.queryByRole('button', { name: 'Clear input' }),
    ).not.toBeInTheDocument();

    await user.type(input, 'Example');
    const clear = screen.getByRole('button', { name: 'Clear input' });
    await user.click(clear);

    expect(input).toHaveValue('');
    expect(input).toHaveFocus();
    expect(clear).not.toBeInTheDocument();
  });

  it('does not offer clearing for disabled or read-only fields', () => {
    const { rerender } = render(
      <ClearableInput aria-label="Disabled" disabled value="Example" />,
    );
    expect(
      screen.queryByRole('button', { name: 'Clear input' }),
    ).not.toBeInTheDocument();

    rerender(
      <ClearableInput aria-label="Read only" readOnly value="Example" />,
    );
    expect(
      screen.queryByRole('button', { name: 'Clear input' }),
    ).not.toBeInTheDocument();
  });

  it('preserves a feature-specific accessible clear label', () => {
    render(
      <ClearableInput
        aria-label="Folders"
        clearLabel="Clear folder filter"
        value="Example"
      />,
    );

    expect(
      screen.getByRole('button', { name: 'Clear folder filter' }),
    ).toBeVisible();
  });
});
