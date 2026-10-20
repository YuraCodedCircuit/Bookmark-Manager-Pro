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
  | 'open-bookmark'
  | 'open-new'
  | 'paste'
  | 'pin'
  | 'search'
  | 'select-all';

interface ContextMenuIconProps {
  name: ContextMenuIconName;
}

const iconTransforms: Record<ContextMenuIconName, string> = {
  'bookmark-add': '',
  copy: 'translate(12 12) scale(1.142857) translate(-12 -12)',
  cut: 'translate(12 12) scale(1.066667) translate(-10.75 -12)',
  delete: '',
  duplicate: 'translate(12 12) scale(1.142857) translate(-12 -12)',
  edit: 'translate(12 12) scale(1.230769) translate(-11.5 -12.5)',
  'folder-add': 'translate(12 12) scale(1.142857) translate(-12 -12)',
  'folder-style': '',
  info: '',
  open: 'translate(12 12) scale(1.142857) translate(-12 -12)',
  'open-bookmark': '',
  'open-new': 'translate(12 12) scale(1.142857) translate(-12 -12)',
  paste: '',
  pin: '',
  search: 'translate(12 12) scale(1.142857) translate(-12 -12)',
  'select-all': '',
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
      return <path d="M5 19V5h6l2 2h6v12H5Z" />;
    case 'open-bookmark':
      return <path d="M5.5 4h13v16L12 17l-6.5 3V4Z" />;
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
          <path d="M5.5 4h13v16L12 17l-6.5 3V4Z" />
          <path d="M12 7v6M9 10h6" />
        </>
      );
    case 'folder-add':
      return (
        <>
          <path d="M5 19V5h6l2 2h6v12H5Z" />
          <path d="M12 10v6M9 13h6" />
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
          <path d="M20 10V8h-8l-2-2H4v12h5" />
          <path d="m17 11 3 3-6 6h-3v-3l6-6Zm-1.5 1.5 3 3" />
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
    case 'select-all':
      return (
        <>
          <path d="M8 5H5v3M16 5h3v3M8 19H5v-3M16 19h3v-3" />
          <rect height="8" rx="1" width="8" x="8" y="8" />
        </>
      );
  }
}
