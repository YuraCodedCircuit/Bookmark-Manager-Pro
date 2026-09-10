import type { SVGProps } from 'react';

export function PermissionIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      viewBox="0 0 20 20"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M10 2.5 16 5v4.25c0 3.7-2.35 6.65-6 8.25-3.65-1.6-6-4.55-6-8.25V5l6-2.5Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <path
        d="m7.25 10 1.75 1.75 3.75-4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}
