import type { Profile } from '../../domain/profile';
import { ProfileIcon } from '../../components/icons/ProfileIcon';
import type { ProfilePreferences } from '../../domain/profile-settings';

/** Displays a stored profile image with the shared profile glyph as fallback. */
export function ProfileAvatar({
  fallback = 'built-in',
  profile,
}: {
  fallback?: ProfilePreferences['defaultProfileIcon'];
  profile: Pick<Profile, 'icon' | 'username'>;
}) {
  return profile.icon ? (
    <img alt="" className="profile-avatar" src={profile.icon} />
  ) : fallback === 'built-in' ? (
    <span
      aria-hidden="true"
      className="profile-avatar profile-avatar--fallback"
    >
      <ProfileIcon />
    </span>
  ) : (
    <span
      aria-hidden="true"
      className="profile-avatar profile-avatar--fallback"
    >
      {fallback === 'initials'
        ? profile.username.trim().slice(0, 2).toLocaleUpperCase()
        : null}
    </span>
  );
}
