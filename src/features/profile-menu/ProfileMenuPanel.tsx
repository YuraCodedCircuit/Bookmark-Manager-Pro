import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { animate } from 'motion/mini';

import type { InitializationState } from '../../application/initialization/initialization-state';
import { ClearIcon } from '../../components/icons/ClearIcon';
import { ProfileIcon } from '../../components/icons/ProfileIcon';
import { useAnimatedSidePanel } from '../../components/side-panel/use-animated-side-panel';
import {
  useMotionPreference,
  usePrefersReducedMotion,
} from '../../shared/use-prefers-reduced-motion';

interface ProfileMenuPanelProps {
  initializationState: InitializationState;
  isOpen: boolean;
  onAfterClose: () => void;
  onOpenAbout: () => void;
  onOpenBookmarkActivityLog: () => void;
  onOpenChangelog: () => void;
  onOpenHelp: () => void;
  onOpenLegal: () => void;
  onOpenUndoHistory: () => void;
  onOpenSynchronization: () => void;
  onClose: () => void;
  onManageProfiles: () => void;
  onOpenSettings: () => void;
  onSwitchProfile: () => void;
}

const menuSections = [
  {
    heading: 'profileMenu.sections.profile',
    items: ['switchProfile', 'manageProfiles'],
  },
  {
    heading: 'profileMenu.sections.application',
    items: ['settings'],
  },
  {
    heading: 'profileMenu.sections.data',
    items: ['import', 'export', 'backup', 'synchronization'],
  },
  {
    heading: 'profileMenu.sections.activity',
    items: ['undoHistory', 'bookmarkActivityLog'],
  },
  {
    heading: 'profileMenu.sections.information',
    items: ['help', 'changelog', 'legal', 'about'],
  },
] as const;

export function ProfileMenuPanel({
  initializationState,
  isOpen,
  onAfterClose,
  onClose,
  onManageProfiles,
  onOpenAbout,
  onOpenBookmarkActivityLog,
  onOpenChangelog,
  onOpenHelp,
  onOpenLegal,
  onOpenUndoHistory,
  onOpenSynchronization,
  onOpenSettings,
  onSwitchProfile,
}: ProfileMenuPanelProps) {
  const { t } = useTranslation();
  const [highlightedItem, setHighlightedItem] = useState<string>();
  const avatarRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const descriptionRef = useRef<HTMLSpanElement>(null);
  const nameRef = useRef<HTMLElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const motionPreference = useMotionPreference();
  const profileSummaryElements = () =>
    [avatarRef.current, nameRef.current, descriptionRef.current].filter(
      (element): element is HTMLElement => element !== null,
    );
  const dialogRef = useAnimatedSidePanel({
    closedTransform: 'translateX(100%)',
    initialFocusRef: closeButtonRef,
    isOpen,
    onAfterClose: () => {
      onAfterClose();
    },
    onAfterOpen: () => {
      profileSummaryElements().forEach((element, index) => {
        if (motionPreference === 'none') {
          element.style.opacity = '1';
          element.style.transform = 'translateY(0)';
          return;
        }
        if (typeof element.animate !== 'function') {
          element.style.opacity = '1';
          element.style.transform = 'translateY(0)';
          return;
        }

        animate(
          element,
          prefersReducedMotion
            ? { opacity: 1 }
            : { opacity: 1, transform: 'translateY(0)' },
          {
            delay: index * 0.07,
            duration: prefersReducedMotion ? 0.1 : 0.18,
            ease: [0.22, 1, 0.36, 1],
          },
        );
      });
    },
    onBeforeOpen: () => {
      profileSummaryElements().forEach((element) => {
        element.style.opacity = motionPreference === 'none' ? '1' : '0';
        element.style.transform = prefersReducedMotion
          ? 'translateY(0)'
          : 'translateY(-0.5rem)';
      });
    },
  });
  const profileName =
    initializationState.status === 'ready'
      ? initializationState.profile.username
      : t('profileMenu.profileSetup');
  const profileStatus =
    initializationState.status === 'ready'
      ? t('profileMenu.activeProfile')
      : t('profileMenu.profileNotCreated');
  const fallbackIcon =
    initializationState.status === 'ready'
      ? (initializationState.settings.profilePreferences?.defaultProfileIcon ??
        'built-in')
      : 'built-in';

  return (
    <dialog
      aria-label={t('profileMenu.label')}
      className="side-panel profile-menu-panel"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.currentTarget === event.target) {
          onClose();
        }
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          onClose();
        }
      }}
      ref={dialogRef}
      tabIndex={-1}
    >
      <header className="profile-menu__header">
        <div
          aria-hidden="true"
          className="profile-menu__avatar"
          ref={avatarRef}
        >
          {initializationState.status === 'ready' &&
          initializationState.profile.icon ? (
            <img alt="" src={initializationState.profile.icon} />
          ) : fallbackIcon === 'built-in' ? (
            <ProfileIcon />
          ) : fallbackIcon === 'initials' ? (
            profileName.trim().slice(0, 2).toLocaleUpperCase()
          ) : null}
        </div>
        <div className="profile-menu__identity">
          <strong ref={nameRef}>{profileName}</strong>
          <span ref={descriptionRef}>{profileStatus}</span>
        </div>
        <button
          aria-label={t('profileMenu.close')}
          className="profile-menu__close"
          onClick={onClose}
          ref={closeButtonRef}
          type="button"
        >
          <ClearIcon />
        </button>
      </header>

      <div className="profile-menu__sections">
        {menuSections.map((section) => (
          <section className="profile-menu__section" key={section.heading}>
            <h2>{t(section.heading)}</h2>
            <div className="profile-menu__items">
              {section.items.map((item) => {
                const isAvailableCommand =
                  item === 'switchProfile' ||
                  item === 'manageProfiles' ||
                  item === 'about' ||
                  item === 'changelog' ||
                  item === 'help' ||
                  item === 'legal' ||
                  (item === 'settings' &&
                    initializationState.status === 'ready') ||
                  (item === 'bookmarkActivityLog' &&
                    initializationState.status === 'ready') ||
                  (item === 'undoHistory' &&
                    initializationState.status === 'ready') ||
                  (item === 'synchronization' &&
                    initializationState.status === 'ready');
                return (
                  <button
                    data-highlighted={
                      isAvailableCommand && highlightedItem === item
                        ? 'true'
                        : undefined
                    }
                    disabled={!isAvailableCommand}
                    key={item}
                    onClick={
                      item === 'switchProfile'
                        ? onSwitchProfile
                        : item === 'manageProfiles'
                          ? onManageProfiles
                          : item === 'settings'
                            ? onOpenSettings
                            : item === 'changelog'
                              ? onOpenChangelog
                              : item === 'help'
                                ? onOpenHelp
                                : item === 'legal'
                                  ? onOpenLegal
                                  : item === 'about'
                                    ? onOpenAbout
                                    : item === 'bookmarkActivityLog'
                                      ? onOpenBookmarkActivityLog
                                      : item === 'undoHistory'
                                        ? onOpenUndoHistory
                                        : item === 'synchronization'
                                          ? onOpenSynchronization
                                          : undefined
                    }
                    onMouseEnter={() => {
                      if (isAvailableCommand) setHighlightedItem(item);
                    }}
                    onMouseLeave={() => {
                      if (highlightedItem === item)
                        setHighlightedItem(undefined);
                    }}
                    type="button"
                  >
                    <span>{t(`profileMenu.items.${item}`)}</span>
                    {!isAvailableCommand ? (
                      <small>{t('profileMenu.comingSoon')}</small>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </dialog>
  );
}
