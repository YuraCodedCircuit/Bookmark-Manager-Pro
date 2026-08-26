interface PinIconProps {
  filled?: boolean;
}

export function PinIcon({ filled = false }: PinIconProps) {
  return (
    <svg
      aria-hidden="true"
      fill={filled ? 'currentColor' : 'none'}
      viewBox="0 0 24 24"
    >
      <path
        d="m8 4 8 0-1.5 5 3 3v2H6.5v-2l3-3L8 4Zm4 10v6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}
