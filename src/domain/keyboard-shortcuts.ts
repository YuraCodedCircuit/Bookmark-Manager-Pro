import { z } from 'zod';

export const shortcutActions = [
  'search',
  'copy',
  'cut',
  'paste',
  'undo',
  'redo',
  'history',
] as const;

export type ShortcutAction = (typeof shortcutActions)[number];

const shortcutBindingSchema = z
  .string()
  .regex(
    /^(?=.*(?:Control|Alt|Shift)\+)(?:(?:Control|Alt|Shift)\+)+(?:[A-Z0-9])$/,
  );

export const shortcutBindingsSchema = z.object({
  search: shortcutBindingSchema,
  copy: shortcutBindingSchema,
  cut: shortcutBindingSchema,
  paste: shortcutBindingSchema,
  undo: shortcutBindingSchema,
  redo: shortcutBindingSchema,
  history: shortcutBindingSchema,
});

export const shortcutPreferencesSchema = z.object({
  bindings: shortcutBindingsSchema,
  enabled: z.boolean(),
});

export type ShortcutBindings = z.infer<typeof shortcutBindingsSchema>;
export type ShortcutPreferences = z.infer<typeof shortcutPreferencesSchema>;

export const defaultShortcutBindings: ShortcutBindings = {
  search: 'Control+F',
  copy: 'Control+C',
  cut: 'Control+X',
  paste: 'Control+V',
  undo: 'Control+Z',
  redo: 'Control+Y',
  history: 'Control+Shift+Z',
};

export const defaultShortcutPreferences: ShortcutPreferences = {
  bindings: defaultShortcutBindings,
  enabled: true,
};

const reservedBindings = new Set([
  'Control+L',
  'Control+N',
  'Control+R',
  'Control+T',
  'Control+W',
  'Control+Shift+N',
]);

export function bindingFromKeyboardEvent(event: KeyboardEvent) {
  if (event.metaKey || ['Alt', 'Control', 'Meta', 'Shift'].includes(event.key))
    return undefined;
  const key = event.key.length === 1 ? event.key.toLocaleUpperCase() : '';
  if (!/^[A-Z0-9]$/.test(key)) return undefined;
  const modifiers = [
    event.ctrlKey ? 'Control' : '',
    event.altKey ? 'Alt' : '',
    event.shiftKey ? 'Shift' : '',
  ].filter(Boolean);
  if (modifiers.length === 0) return undefined;
  return [...modifiers, key].join('+');
}

export function isReservedShortcut(binding: string) {
  return reservedBindings.has(binding);
}

export function matchesShortcut(event: KeyboardEvent, binding: string) {
  const parts = new Set(binding.split('+'));
  return (
    !event.metaKey &&
    event.ctrlKey === parts.has('Control') &&
    event.altKey === parts.has('Alt') &&
    event.shiftKey === parts.has('Shift') &&
    event.key.toLocaleUpperCase() === binding.split('+').at(-1)
  );
}

export function hasCustomizedShortcuts(bindings: ShortcutBindings) {
  return shortcutActions.some(
    (action) => bindings[action] !== defaultShortcutBindings[action],
  );
}
