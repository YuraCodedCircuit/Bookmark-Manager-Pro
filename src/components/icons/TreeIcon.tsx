import type { SVGProps } from 'react';

export function TreeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M12 7.5v3.75m0 0H6.5A2.5 2.5 0 0 0 4 13.75v1.75m8-4.25h5.5a2.5 2.5 0 0 1 2.5 2.5v1.75"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.75"
      />
      <rect
        height="4.5"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.75"
        width="5"
        x="9.5"
        y="2.25"
      />
      <rect
        height="4.5"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.75"
        width="5"
        x="1.5"
        y="16.25"
      />
      <rect
        height="4.5"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.75"
        width="5"
        x="17.5"
        y="16.25"
      />
    </svg>
  );
}
