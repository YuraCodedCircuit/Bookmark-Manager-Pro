export type ContextMenuIconName =
  | 'bookmark-add'
  | 'copy'
  | 'cut'
  | 'delete'
  | 'duplicate'
  | 'edit'
  | 'folder-add'
  | 'folder-style'
  | 'info'
  | 'open'
  | 'open-new'
  | 'paste'
  | 'pin'
  | 'search';

interface ContextMenuIconProps {
  name: ContextMenuIconName;
}

const iconTransforms: Record<ContextMenuIconName, string> = {
  'bookmark-add': 'translate(12 12) scale(1.6 1) translate(-12 -12)',
  copy: 'translate(12 12) scale(1.142857) translate(-12 -12)',
  cut: 'translate(12 12) scale(1.103448 1.066667) translate(-10.75 -12)',
  delete: 'translate(12 12) scale(1.142857 1) translate(-12 -12)',
  duplicate: 'translate(12 12) scale(1.142857) translate(-12 -12)',
  edit: 'translate(12 12) scale(1.230769) translate(-11.5 -12.5)',
  'folder-add': 'translate(12 12) scale(1 1.333333) translate(-12 -12)',
  'folder-style': 'translate(12 12) scale(1 1.333333) translate(-12 -12)',
  info: '',
  open: 'translate(12 12) scale(1.142857) translate(-12 -12)',
  'open-new': 'translate(12 12) scale(1.142857) translate(-12 -12)',
  paste: 'translate(12 12) scale(1.333333 1) translate(-12 -12)',
  pin: '',
  search: 'translate(12 12) scale(1.142857) translate(-12 -12)',
};

export function ContextMenuIcon({ name }: ContextMenuIconProps) {
  return (
    <svg
      aria-hidden="true"
      className="context-menu__icon"
      fill="none"
      viewBox="0 0 24 24"
    >
      <g data-glyph-frame="square" transform={iconTransforms[name]}>
        {getIconPaths(name)}
      </g>
    </svg>
  );
}

function getIconPaths(name: ContextMenuIconName) {
  switch (name) {
    case 'open':
      return <path d="M5 19V5h6l2 2h6v12H5Zm3-4 3-3 2 2 3-4" />;
    case 'open-new':
      return (
        <>
          <path d="M13 5h6v6M19 5l-8 8" />
          <path d="M17 13v6H5V7h6" />
        </>
      );
    case 'edit':
      return (
        <>
          <path d="m14 6 4 4-9 9H5v-4l9-9Z" />
          <path d="m12 8 4 4" />
        </>
      );
    case 'copy':
      return (
        <>
          <rect height="11" rx="1.5" width="11" x="8" y="8" />
          <path d="M16 8V5H5v11h3" />
        </>
      );
    case 'duplicate':
      return (
        <>
          <rect height="11" rx="1.5" width="11" x="8" y="8" />
          <path d="M12 11v5M9.5 13.5h5M16 8V5H5v11h3" />
        </>
      );
    case 'cut':
      return (
        <>
          <circle cx="6" cy="17" r="2.5" />
          <circle cx="6" cy="7" r="2.5" />
          <path d="m8 8.5 10 7M8 15.5l10-7" />
        </>
      );
    case 'info':
      return (
        <>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 11v5M12 8h.01" />
        </>
      );
    case 'delete':
      return (
        <>
          <path d="M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13" />
          <path d="M10 10v6M14 10v6" />
        </>
      );
    case 'bookmark-add':
      return (
        <>
          <path d="M7 4h10v16l-5-3-5 3V4Z" />
          <path d="M12 7v6M9 10h6" />
        </>
      );
    case 'folder-add':
      return (
        <>
          <path d="M4 6h6l2 2h8v10H4V6Z" />
          <path d="M12 11v5M9.5 13.5h5" />
        </>
      );
    case 'paste':
      return (
        <>
          <path d="M9 6H6v14h12V6h-3" />
          <path d="M9 4h6v4H9V4Z" />
        </>
      );
    case 'folder-style':
      return (
        <>
          <path d="M4 6h6l2 2h8v10H4V6Z" />
          <path d="M12 10s-2.5 2.7-2.5 4.2a2.5 2.5 0 0 0 5 0C14.5 12.7 12 10 12 10Z" />
        </>
      );
    case 'search':
      return (
        <>
          <circle cx="10.5" cy="10.5" r="5.5" />
          <path d="m15 15 4 4" />
        </>
      );
    case 'pin':
      return <path d="m8 4h8l-1.5 5 3 3v2h-11v-2l3-3L8 4Zm4 10v6" />;
  }
}
