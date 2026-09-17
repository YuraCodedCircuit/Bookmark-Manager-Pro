import { z } from 'zod';

export const shortcutActions = [
  'search',
  'copy',
  'cut',
  'paste',
  'undo',
  'redo',
  'history',
  'noteNew',
  'noteSave',
  'notePreview',
  'noteImportant',
  'noteHeading',
  'noteBold',
  'noteItalic',
  'noteStrike',
  'noteBullet',
  'noteNumbered',
  'noteTask',
  'noteQuote',
  'noteInlineCode',
  'noteCodeBlock',
  'noteLink',
] as const;

export type ShortcutAction = (typeof shortcutActions)[number];

const shortcutBindingSchema = z
  .string()
  .regex(
    /^(?=.*(?:Control|Alt|Shift)\+)(?:(?:Control|Alt|Shift)\+)+(?:[A-Z0-9])$/,
  )
  .nullable();

export const shortcutBindingsSchema = z.object({
  search: shortcutBindingSchema,
  copy: shortcutBindingSchema,
  cut: shortcutBindingSchema,
  paste: shortcutBindingSchema,
  undo: shortcutBindingSchema,
  redo: shortcutBindingSchema,
  history: shortcutBindingSchema,
  noteNew: shortcutBindingSchema.default('Alt+N'),
  noteSave: shortcutBindingSchema.default('Control+S'),
  notePreview: shortcutBindingSchema.default('Alt+P'),
  noteImportant: shortcutBindingSchema.default('Alt+I'),
  noteHeading: shortcutBindingSchema.default('Alt+H'),
  noteBold: shortcutBindingSchema.default('Control+B'),
  noteItalic: shortcutBindingSchema.default('Control+I'),
  noteStrike: shortcutBindingSchema.default('Alt+S'),
  noteBullet: shortcutBindingSchema.default('Alt+B'),
  noteNumbered: shortcutBindingSchema.default('Alt+1'),
  noteTask: shortcutBindingSchema.default('Alt+T'),
  noteQuote: shortcutBindingSchema.default('Alt+Q'),
  noteInlineCode: shortcutBindingSchema.default('Alt+C'),
  noteCodeBlock: shortcutBindingSchema.default('Alt+Shift+C'),
  noteLink: shortcutBindingSchema.default('Control+K'),
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
  noteNew: 'Alt+N',
  noteSave: 'Control+S',
  notePreview: 'Alt+P',
  noteImportant: 'Alt+I',
  noteHeading: 'Alt+H',
  noteBold: 'Control+B',
  noteItalic: 'Control+I',
  noteStrike: 'Alt+S',
  noteBullet: 'Alt+B',
  noteNumbered: 'Alt+1',
  noteTask: 'Alt+T',
  noteQuote: 'Alt+Q',
  noteInlineCode: 'Alt+C',
  noteCodeBlock: 'Alt+Shift+C',
  noteLink: 'Control+K',
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

export function matchesShortcut(event: KeyboardEvent, binding: string | null) {
  if (!binding) return false;
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
