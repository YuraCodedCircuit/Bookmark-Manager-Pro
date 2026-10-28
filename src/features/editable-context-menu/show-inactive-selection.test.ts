import { afterEach, expect, it } from 'vitest';
import { showInactiveSelection } from './show-inactive-selection';

afterEach(() => document.body.replaceChildren());

it('paints inert text without parsing markup and removes it on disposal', () => {
  const target = document.createElement('input');
  target.value = '<img src=x onerror=alert(1)> hello';
  document.body.append(target);
  const dispose = showInactiveSelection(target, 0, 5);
  const preview = document.querySelector<HTMLElement>(
    '.editable-selection-preview',
  )!;
  expect(preview.getAttribute('aria-hidden')).toBe('true');
  expect(preview.inert).toBe(true);
  expect(preview.querySelector('img')).toBeNull();
  expect(preview.querySelector('span')?.textContent).toBe('<img ');
  expect(preview.textContent).toBe(target.value);
  expect(preview.style.visibility).toBe('visible');
  target.focus();
  expect(preview.style.visibility).toBe('hidden');
  target.blur();
  dispose();
  expect(preview.isConnected).toBe(false);
  expect(preview.textContent).toBe('');
});

it('keeps textarea wrapping and scrolling local to its dialog', () => {
  const dialog = document.createElement('dialog');
  const target = document.createElement('textarea');
  target.value = 'First\nSecond line';
  target.scrollTop = 20;
  dialog.append(target);
  document.body.append(dialog);
  const dispose = showInactiveSelection(target, 6, 12);
  const preview = dialog.querySelector<HTMLElement>(
    '.editable-selection-preview',
  )!;
  expect(preview.firstElementChild).toHaveStyle({
    whiteSpace: 'pre-wrap',
    transform: 'translate(0px, -20px)',
  });
  expect(preview.querySelector('span')?.textContent).toBe('Second');
  dispose();
});

it('never mirrors passwords, immutable fields, or collapsed selections', () => {
  const target = document.createElement('input');
  target.value = 'Private';
  target.type = 'password';
  document.body.append(target);
  showInactiveSelection(target, 0, 7)();
  target.type = 'text';
  target.readOnly = true;
  showInactiveSelection(target, 0, 7)();
  target.readOnly = false;
  showInactiveSelection(target, 2, 2)();
  expect(document.querySelector('.editable-selection-preview')).toBeNull();
});

it('preserves the captured input viewport when blur resets its scroll offset', () => {
  const target = document.createElement('input');
  target.value = 'A long selected value';
  target.scrollLeft = 100;
  document.body.append(target);
  const dispose = showInactiveSelection(target, 2, 8);
  target.scrollLeft = 0;
  target.dispatchEvent(new Event('scroll'));
  expect(target.scrollLeft).toBe(100);
  dispose();
  target.scrollLeft = 0;
  target.dispatchEvent(new Event('scroll'));
  expect(target.scrollLeft).toBe(0);
});

it.each([
  { browser: 'Firefox', clientLeft: 13, clientWidth: 304 },
  { browser: 'Chromium', clientLeft: 1, clientWidth: 328 },
])(
  'aligns the selection with input text in $browser',
  ({ clientLeft, clientWidth }) => {
    const target = document.createElement('input');
    target.value = 'Selected text';
    target.style.cssText = 'padding: 11px 12px; border: 1px solid;';
    Object.defineProperties(target, {
      clientLeft: { value: clientLeft },
      clientWidth: { value: clientWidth },
    });
    target.getBoundingClientRect = () => new DOMRect(33, 50, 330, 40);
    document.body.append(target);
    const dispose = showInactiveSelection(target, 0, 8);
    const preview = document.querySelector<HTMLElement>(
      '.editable-selection-preview',
    )!;
    expect(preview.style.left).toBe('46px');
    expect(preview.style.width).toBe('304px');
    dispose();
  },
);
