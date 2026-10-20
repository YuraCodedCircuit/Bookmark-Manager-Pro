/** Shows the action available to reveal or conceal a password. */
export function PasswordVisibilityIcon({ revealed }: { revealed: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {revealed ? (
        <>
          <path d="M3 9c2.3 3.4 5.3 5 9 5s6.7-1.6 9-5M5 12l-2 3m6-1-1 3m7-3 1 3m3-5 2 3" />
        </>
      ) : (
        <>
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
          <circle cx="12" cy="12" r="3" />
        </>
      )}
    </svg>
  );
}
