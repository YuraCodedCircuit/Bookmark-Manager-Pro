import type { CSSProperties } from 'react';

import type { ItemAppearance } from '../domain/bookmark';
import type { FolderBackgroundAppearance } from '../domain/folder';

/** Maps validated appearance data to inert CSS background properties. */
export function appearanceStyle(
  appearance: ItemAppearance | FolderBackgroundAppearance,
): CSSProperties {
  if (appearance.kind === 'none') return {};
  if (appearance.kind === 'color') return { background: appearance.value };
  if (appearance.kind === 'gradient') {
    return {
      background: `linear-gradient(${appearance.direction}deg, ${appearance.colors.join(', ')})`,
    };
  }
  const fit = {
    center: {
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      backgroundSize: 'auto',
    },
    fill: {
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      backgroundSize: 'cover',
    },
    fit: {
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      backgroundSize: 'contain',
    },
    span: {
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      backgroundSize: '100% auto',
    },
    stretch: {
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      backgroundSize: '100% 100%',
    },
    tile: {
      backgroundPosition: 'top left',
      backgroundRepeat: 'repeat',
      backgroundSize: 'auto',
    },
  } satisfies Record<typeof appearance.fit, CSSProperties>;
  return {
    backgroundColor: 'var(--surface)',
    backgroundImage: `url("${appearance.value}")`,
    ...fit[appearance.fit],
  };
}

/** Keeps folder images viewport-fixed while preserving their validated fit. */
export function folderBackgroundStyle(
  appearance: FolderBackgroundAppearance,
): CSSProperties {
  const style = appearanceStyle(appearance);
  return appearance.kind === 'image'
    ? { ...style, backgroundAttachment: 'fixed' }
    : style;
}
