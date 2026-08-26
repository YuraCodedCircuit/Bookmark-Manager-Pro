import { useEffect, useEffectEvent, useRef, type RefObject } from 'react';
import { animate } from 'motion/mini';

import {
  useMotionPreference,
  usePrefersReducedMotion,
} from '../../shared/use-prefers-reduced-motion';

interface UseAnimatedSidePanelOptions {
  closedTransform: 'translateX(-100%)' | 'translateX(100%)';
  initialFocusRef: RefObject<HTMLElement | null>;
  isOpen: boolean;
  onAfterClose: () => void;
  onAfterOpen?: () => void;
  onBeforeOpen?: () => void;
}

export function useAnimatedSidePanel({
  closedTransform,
  initialFocusRef,
  isOpen,
  onAfterClose,
  onAfterOpen,
  onBeforeOpen,
}: UseAnimatedSidePanelOptions) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const handleAfterClose = useEffectEvent(onAfterClose);
  const handleAfterOpen = useEffectEvent(() => onAfterOpen?.());
  const handleBeforeOpen = useEffectEvent(() => onBeforeOpen?.());
  const prefersReducedMotion = usePrefersReducedMotion();
  const motionPreference = useMotionPreference();

  useEffect(() => {
    const dialog = dialogRef.current;

    if (dialog === null) {
      return;
    }

    const closeDialog = () => {
      if (typeof dialog.close === 'function') {
        dialog.close();
      } else {
        dialog.removeAttribute('open');
      }
      dialog.style.removeProperty('opacity');
      dialog.style.removeProperty('transform');
      handleAfterClose();
    };

    if (isOpen) {
      const wasClosed = !dialog.open;

      if (wasClosed) {
        handleBeforeOpen();
        if (typeof dialog.showModal === 'function') {
          dialog.showModal();
        } else {
          dialog.setAttribute('open', '');
        }
        dialog.style.opacity = prefersReducedMotion ? '0' : '1';
        dialog.style.transform = prefersReducedMotion
          ? 'translateX(0)'
          : closedTransform;
      }

      if (motionPreference === 'none') {
        dialog.style.opacity = '1';
        dialog.style.transform = 'translateX(0)';
        initialFocusRef.current?.focus();
        handleAfterOpen();
        return;
      }

      if (typeof dialog.animate === 'function') {
        const openingAnimation = animate(
          dialog,
          prefersReducedMotion
            ? { opacity: 1 }
            : { transform: 'translateX(0)' },
          {
            duration: prefersReducedMotion ? 0.1 : 0.22,
            ease: [0.22, 1, 0.36, 1],
          },
        );
        initialFocusRef.current?.focus();
        void openingAnimation.then(handleAfterOpen);
        return () => openingAnimation.stop();
      }

      dialog.style.opacity = '1';
      dialog.style.transform = 'translateX(0)';
      initialFocusRef.current?.focus();
      handleAfterOpen();
    } else if (dialog.open) {
      if (motionPreference === 'none') {
        closeDialog();
        return;
      }
      if (typeof dialog.animate !== 'function') {
        closeDialog();
        return;
      }

      const closingAnimation = animate(
        dialog,
        prefersReducedMotion ? { opacity: 0 } : { transform: closedTransform },
        {
          duration: prefersReducedMotion ? 0.08 : 0.18,
          ease: [0.4, 0, 1, 1],
        },
      );

      void closingAnimation.then(closeDialog);
      return () => closingAnimation.stop();
    }
  }, [
    closedTransform,
    initialFocusRef,
    isOpen,
    motionPreference,
    prefersReducedMotion,
  ]);

  return dialogRef;
}
