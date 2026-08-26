import { useLayoutEffect, useRef, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';

import { ProfileIcon } from '../../components/icons/ProfileIcon';
import type { Profile } from '../../domain/profile';
import type { ProfilePreferences } from '../../domain/profile-settings';
import { TreeIcon } from '../../components/icons/TreeIcon';
import type { PathSeparator } from '../../platform/navigation/path-separator';

interface TopNavigationProps {
  path: readonly string[];
  pathSeparator: PathSeparator;
  onNavigate: (index: number) => void;
  onOpenProfile: () => void;
  onOpenTree: () => void;
  profileButtonRef: RefObject<HTMLButtonElement | null>;
  profile: Pick<Profile, 'icon' | 'username'> | undefined;
  profileIconFallback?: ProfilePreferences['defaultProfileIcon'];
  treeButtonRef: RefObject<HTMLButtonElement | null>;
}

export function TopNavigation({
  path,
  pathSeparator,
  onNavigate,
  onOpenProfile,
  onOpenTree,
  profileButtonRef,
  profile,
  profileIconFallback = 'built-in',
  treeButtonRef,
}: TopNavigationProps) {
  const { t } = useTranslation();
  const breadcrumbPathRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const breadcrumbPath = breadcrumbPathRef.current;
    if (breadcrumbPath !== null) {
      breadcrumbPath.scrollLeft = breadcrumbPath.scrollWidth;
    }
  }, [path]);

  return (
    <header className="top-navigation">
      <button
        aria-label={t('navigation.openFolderTree')}
        className="icon-button"
        onClick={onOpenTree}
        ref={treeButtonRef}
        type="button"
      >
        <TreeIcon />
      </button>
      <nav aria-label={t('navigation.breadcrumb')} className="breadcrumb">
        {path[0] ? (
          <button
            aria-current={path.length === 1 ? 'page' : undefined}
            className="breadcrumb__home"
            onClick={() => onNavigate(0)}
            type="button"
          >
            {path[0]}
          </button>
        ) : null}
        <div className="breadcrumb__path" ref={breadcrumbPathRef}>
          <ol>
            {path.slice(1).map((item, pathIndex) => {
              const index = pathIndex + 1;
              return (
                <li
                  aria-current={index === path.length - 1 ? 'page' : undefined}
                  key={`${index}-${item}`}
                >
                  <span aria-hidden="true" className="breadcrumb__separator">
                    {pathSeparator}
                  </span>
                  <button onClick={() => onNavigate(index)} type="button">
                    {item}
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      </nav>
      <button
        aria-label={t('navigation.openProfileMenu')}
        className="icon-button icon-button--round"
        onClick={onOpenProfile}
        ref={profileButtonRef}
        type="button"
      >
        {profile?.icon ? (
          <img
            alt=""
            className="top-navigation__profile-image"
            src={profile.icon}
          />
        ) : profileIconFallback === 'built-in' ? (
          <ProfileIcon />
        ) : profileIconFallback === 'initials' && profile ? (
          profile.username.trim().slice(0, 2).toLocaleUpperCase()
        ) : null}
      </button>
    </header>
  );
}
