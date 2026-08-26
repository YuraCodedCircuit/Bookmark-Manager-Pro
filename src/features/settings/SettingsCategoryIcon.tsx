import type { ReactNode, SVGProps } from 'react';

import type { SettingsCategory } from './settings-categories';

interface SettingsCategoryIconProps extends SVGProps<SVGSVGElement> {
  category: SettingsCategory;
}

/**
 * Renders the compact outline icon used by one Settings navigation category.
 * The icons inherit the row color so selected, hover, and high-contrast states
 * remain synchronized with their text labels.
 */
export function SettingsCategoryIcon({
  category,
  ...props
}: SettingsCategoryIconProps) {
  const paths: Record<SettingsCategory, ReactNode> = {
    general: (
      <>
        <path d="M3 6h5m4 0h9M3 12h10m4 0h4M3 18h3m4 0h11" />
        <circle cx="10" cy="6" r="2" />
        <circle cx="15" cy="12" r="2" />
        <circle cx="8" cy="18" r="2" />
      </>
    ),
    appearance: (
      <>
        <path d="M12 3a9 9 0 0 0 0 18h1.4a2.4 2.4 0 0 0 1.3-4.4 1.9 1.9 0 0 1 1.1-3.5H18A3 3 0 0 0 21 10c0-4.1-4-7-9-7Z" />
        <circle cx="7.2" cy="10.2" r="1" />
        <circle cx="9.1" cy="6.6" r="1" />
        <circle cx="13.4" cy="6" r="1" />
        <circle cx="17.1" cy="8.2" r="1" />
      </>
    ),
    language: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" />
      </>
    ),
    bookmarks: <path d="M6 3.5h12v17L12 17l-6 3.5v-17Z" />,
    search: (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m15.5 15.5 5 5" />
      </>
    ),
    profiles: (
      <>
        <circle cx="9" cy="8" r="3" />
        <circle cx="17" cy="10" r="2.5" />
        <path d="M3.5 20a5.5 5.5 0 0 1 11 0M14 16.5a4.5 4.5 0 0 1 6.5 3.5" />
      </>
    ),
    activity: <path d="M3 12h4l2.5-6 4 12 2.5-6h5" />,
    notifications: (
      <>
        <path d="M6 9a6 6 0 0 1 12 0v5l2 3H4l2-3V9Z" />
        <path d="M10 20h4" />
      </>
    ),
    import: <path d="M12 3v12m-4-4 4 4 4-4M5 20h14" />,
    export: <path d="M12 16V4m-4 4 4-4 4 4M5 20h14" />,
    backup: (
      <>
        <path d="M5 7.5A8 8 0 1 1 4.5 15" />
        <path d="M5 3v4.5H.5M12 8v5l3 2" />
      </>
    ),
    security: (
      <path d="M12 3 20 6v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-3Z" />
    ),
    accessibility: (
      <>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="7" r="1.4" />
        <path d="M6.5 10h11M12 10v5.2M12 15.2 8.5 20M12 15.2l3.5 4.8" />
      </>
    ),
    shortcuts: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M7 10h.01M11 10h.01M15 10h2M7 14h2M11 14h6" />
      </>
    ),
    advanced: (
      <>
        <ellipse cx="12" cy="5.5" rx="8" ry="3" />
        <path d="M4 5.5v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6M4 11.5v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
        <circle cx="7.2" cy="10.1" r=".8" />
        <circle cx="7.2" cy="16.2" r=".8" />
        <path d="M11 10.5h5M11 16.5h5" />
      </>
    ),
  };

  return (
    <svg
      aria-hidden="true"
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <g
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      >
        {paths[category]}
      </g>
    </svg>
  );
}
