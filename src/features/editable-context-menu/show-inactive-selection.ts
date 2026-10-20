import {
  getEditableTextControl,
  type EditableTextControl,
} from './editable-text-control';

/** Paints a transient, inert selection while menu focus hides the native one.
 * Text is copied only into text nodes, never HTML, and removed on disposal.
 */
export function showInactiveSelection(
  target: EditableTextControl,
  start: number,
  end: number,
): () => void {
  if (getEditableTextControl(target) !== target || end <= start)
    return () => {};
  const style = getComputedStyle(target);
  const bounds = target.getBoundingClientRect();
  const scrollLeft = target.scrollLeft;
  const pixels = (value: string) => Number.parseFloat(value) || 0;
  const left = pixels(style.paddingLeft);
  const top = pixels(style.paddingTop);
  const preview = document.createElement('div');
  preview.className = 'editable-selection-preview';
  preview.setAttribute('aria-hidden', 'true');
  preview.inert = true;
  Object.assign(preview.style, {
    position: 'fixed',
    left: `${bounds.left + target.clientLeft + left}px`,
    top: `${bounds.top + target.clientTop + top}px`,
    width: `${Math.max(0, target.clientWidth - left - pixels(style.paddingRight))}px`,
    height: `${Math.max(0, target.clientHeight - top - pixels(style.paddingBottom))}px`,
    overflow: 'hidden',
    pointerEvents: 'none',
    color: 'transparent',
    // Forced colors can leave the computed font shorthand empty. Copy its
    // components, and preserve transparent text plus the user's system colors.
    fontFamily: style.fontFamily,
    fontSize: style.fontSize,
    fontStyle: style.fontStyle,
    fontWeight: style.fontWeight,
    fontStretch: style.fontStretch,
    fontVariant: style.fontVariant,
    fontKerning: style.fontKerning,
    fontFeatureSettings: style.fontFeatureSettings,
    fontVariationSettings: style.fontVariationSettings,
    forcedColorAdjust: 'none',
    letterSpacing: style.letterSpacing,
    wordSpacing: style.wordSpacing,
    textAlign: style.textAlign,
    textIndent: style.textIndent,
    textTransform: style.textTransform,
    direction: style.direction,
    // Above field/backplate layers, immediately below the shared menu (100).
    zIndex: '99',
  });
  const content = document.createElement('div');
  const multiline = target instanceof HTMLTextAreaElement;
  Object.assign(content.style, {
    whiteSpace: multiline && target.wrap !== 'off' ? 'pre-wrap' : 'pre',
    overflowWrap: style.overflowWrap,
    wordBreak: style.wordBreak,
    tabSize: style.tabSize,
    lineHeight: style.lineHeight,
    transform: `translate(${-target.scrollLeft}px, ${-target.scrollTop}px)`,
  });
  if (!multiline) {
    preview.style.display = 'flex';
    preview.style.alignItems = 'center';
    content.style.flex = '0 0 auto';
    content.style.minWidth = '100%';
  }
  const selected = document.createElement('span');
  selected.style.backgroundColor = 'Highlight';
  selected.style.color = 'HighlightText';
  selected.textContent = target.value.slice(start, end);
  content.append(
    document.createTextNode(target.value.slice(0, start)),
    selected,
    document.createTextNode(target.value.slice(end)),
  );
  preview.append(content);
  (target.closest('dialog') ?? document.body).append(preview);
  const update = () => {
    // Once an action restores input focus, native selection owns the painting.
    preview.style.visibility =
      document.activeElement === target ? 'hidden' : 'visible';
  };
  document.addEventListener('focusin', update);
  const preserveInputScroll = () => {
    if (
      target instanceof HTMLInputElement &&
      document.activeElement !== target &&
      target.scrollLeft !== scrollLeft
    )
      target.scrollLeft = scrollLeft;
  };
  target.addEventListener('scroll', preserveInputScroll);
  update();
  return () => {
    document.removeEventListener('focusin', update);
    target.removeEventListener('scroll', preserveInputScroll);
    preview.remove();
    preview.replaceChildren();
  };
}
