import { useCallback, useRef, type Ref, type RefCallback } from 'react';

function handleFileInputCancel(event: Event): void {
  event.stopPropagation();
  if (event.currentTarget instanceof HTMLInputElement) {
    event.currentTarget.value = '';
  }
}

function assignRef<T>(ref: Ref<T> | undefined, value: T | null): void {
  if (typeof ref === 'function') {
    ref(value);
  } else if (ref) {
    ref.current = value;
  }
}

/**
 * Binds the native file-input cancel event that React input props do not type.
 * The listener clears only the pending filename and stops ancestor dialogs from
 * interpreting the bubbling event as an Escape request.
 */
export function useFileInputCancelRef<T extends HTMLInputElement>(
  forwardedRef?: Ref<T>,
): RefCallback<T> {
  const currentNode = useRef<T | null>(null);

  return useCallback(
    (node: T | null) => {
      currentNode.current?.removeEventListener('cancel', handleFileInputCancel);
      currentNode.current = node;
      assignRef(forwardedRef, node);
      node?.addEventListener('cancel', handleFileInputCancel);
    },
    [forwardedRef],
  );
}
