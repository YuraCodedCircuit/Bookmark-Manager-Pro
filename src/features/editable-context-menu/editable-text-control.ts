export type EditableTextControl = HTMLInputElement | HTMLTextAreaElement;

/** Returns supported editable controls while excluding secret and immutable values. */
export function getEditableTextControl(
  target: EventTarget | null,
): EditableTextControl | null {
  if (target instanceof HTMLTextAreaElement)
    return target.disabled || target.readOnly ? null : target;
  if (!(target instanceof HTMLInputElement)) return null;
  if (target.disabled || target.readOnly || target.type === 'password')
    return null;
  return ['email', 'search', 'tel', 'text', 'url'].includes(target.type)
    ? target
    : null;
}
