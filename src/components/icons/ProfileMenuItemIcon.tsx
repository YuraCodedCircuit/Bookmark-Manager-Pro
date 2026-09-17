import type { ReactNode } from 'react';

export type ProfileMenuItem =
  | 'about'
  | 'backup'
  | 'bookmarkActivityLog'
  | 'changelog'
  | 'export'
  | 'help'
  | 'import'
  | 'legal'
  | 'manageProfiles'
  | 'notes'
  | 'passwordGenerator'
  | 'settings'
  | 'switchProfile'
  | 'synchronization'
  | 'undoHistory';

function iconPaths(item: ProfileMenuItem): ReactNode {
  switch (item) {
    case 'switchProfile':
      return (
        <>
          <circle cx="9" cy="8" r="3" />
          <path d="M3.75 19a5.25 5.25 0 0 1 8.8-3.85M16 6h4m0 0-2-2m2 2-2 2M20 13h-4m0 0 2-2m-2 2 2 2" />
        </>
      );
    case 'manageProfiles':
      return (
        <>
          <circle cx="9" cy="8" r="3" />
          <path d="M3.75 19a5.25 5.25 0 0 1 10.5 0M17.5 13.5l.55 1.1 1.2.18-.87.85.2 1.2-1.08-.57-1.08.57.2-1.2-.87-.85 1.2-.18z" />
        </>
      );
    case 'notes':
      return (
        <path d="M6 3.75h8.5L19 8.25v12H6zM14.5 3.75v4.5H19M9 12h7M9 15.5h7" />
      );
    case 'passwordGenerator':
      return (
        <path d="M14.75 3.5a5.75 5.75 0 1 1-4.1 9.78L3.5 20.43V17h3v-3h3l1.17-1.17A5.75 5.75 0 0 1 14.75 3.5Zm2.25 4.25h.01" />
      );
    case 'settings':
      return (
        <>
          <circle cx="12" cy="12" r="5.75" />
          <circle cx="12" cy="12" r="2.35" />
          <path d="M12 2.5v3.75M12 17.75v3.75M2.5 12h3.75M17.75 12h3.75M5.3 5.3l2.65 2.65M16.05 16.05l2.65 2.65M18.7 5.3l-2.65 2.65M7.95 16.05 5.3 18.7" />
        </>
      );
    case 'import':
      return <path d="M12 3.5v11m0 0-4-4m4 4 4-4M5 15.5v4h14v-4" />;
    case 'export':
      return <path d="M12 20.5v-11m0 0-4 4m4-4 4 4M5 8.5v-4h14v4" />;
    case 'backup':
      return (
        <>
          <ellipse cx="9" cy="5.25" rx="5.5" ry="2.25" />
          <path d="M3.5 5.25v9.5C3.5 16 6 17 9 17c1 0 1.95-.12 2.75-.33M14.5 5.25v5.5M3.5 10c0 1.25 2.5 2.25 5.5 2.25 2.38 0 4.4-.63 5.17-1.5" />
          <path d="M20 14.25a4.25 4.25 0 0 0-6.95.65L12 16.25m1.05-1.35-.05 2-2-.05M13 19.75a4.25 4.25 0 0 0 6.95-.65L21 17.75m-1.05 1.35.05-2 2 .05" />
        </>
      );
    case 'synchronization':
      return (
        <path d="M18.5 8A7 7 0 0 0 6.3 6.1L4.5 8M5.5 16a7 7 0 0 0 12.2 1.9l1.8-1.9M4.5 4.5V8H8M19.5 19.5V16H16" />
      );
    case 'undoHistory':
      return (
        <>
          <path d="M5.3 7.2A8 8 0 1 1 4 14.5M5.3 7.2V3.8M5.3 7.2H8.7" />
          <path d="M12 7.5V12l3 2" />
        </>
      );
    case 'bookmarkActivityLog':
      return (
        <>
          <path d="M5 2.75h9l5 5v13.5H5zM14 2.75v5h5" />
          <text
            fill="currentColor"
            fontFamily="Arial, sans-serif"
            fontSize="5.25"
            fontWeight="700"
            stroke="none"
            textAnchor="middle"
            x="12"
            y="15.5"
          >
            LOG
          </text>
        </>
      );
    case 'help':
      return (
        <>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M9.8 9a2.3 2.3 0 1 1 3.15 2.13c-.7.3-.95.87-.95 1.62M12 16.8v.05" />
        </>
      );
    case 'changelog':
      return (
        <>
          <circle cx="12" cy="12" r="9" />
          <text
            fill="currentColor"
            fontFamily="Arial, sans-serif"
            fontSize="4.9"
            fontWeight="700"
            stroke="none"
            textAnchor="middle"
            x="12"
            y="13.75"
          >
            NEW
          </text>
        </>
      );
    case 'legal':
      return (
        <path d="M12 3.5v17M7 6h10M7 6l-3 6h6L7 6Zm10 0-3 6h6l-3-6ZM8.5 20.5h7" />
      );
    case 'about':
      return (
        <>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 10.5v6M12 7.2v.05" />
        </>
      );
  }
}

export function ProfileMenuItemIcon({ item }: { item: ProfileMenuItem }) {
  return (
    <svg aria-hidden="true" fill="none" focusable="false" viewBox="0 0 24 24">
      <g
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      >
        {iconPaths(item)}
      </g>
    </svg>
  );
}
