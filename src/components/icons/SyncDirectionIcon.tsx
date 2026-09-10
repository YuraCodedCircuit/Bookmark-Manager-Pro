import type { SyncDirection } from '../../domain/sync-preview';

/** Arrows follow the extension-left, browser-right layout. */
export function SyncDirectionIcon({ direction }: { direction: SyncDirection }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {direction === 'both' ? (
        <>
          <path d="M20 7H4m5-5L4 7l5 5" />
          <path d="M4 17h16m-5-5 5 5-5 5" />
        </>
      ) : direction === 'browser-to-extension' ? (
        <path d="M20 12H4m7-7-7 7 7 7" />
      ) : (
        <path d="M4 12h16m-7-7 7 7-7 7" />
      )}
    </svg>
  );
}
