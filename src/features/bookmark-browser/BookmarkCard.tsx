import { forwardRef, type AnchorHTMLAttributes } from 'react';
import { useTranslation } from 'react-i18next';

import type { Bookmark } from '../../domain/bookmark';
import { appearanceStyle } from '../../shared/appearance-style';
import {
  resolveBookmarkClickOpening,
  type BookmarkClickOpening,
} from '../../shared/bookmark-click-opening';
import { titleInitials } from '../../shared/title-initials';

interface BookmarkCardProps extends Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  'href' | 'onClick' | 'rel' | 'target'
> {
  bookmark: Bookmark;
  faviconDisplay?: 'available' | 'initials' | undefined;
  missingFavicon?: 'built-in' | 'initials' | 'none' | undefined;
  opening: 'current-tab' | 'new-tab';
  onOpen?: (bookmark: Bookmark, opening: BookmarkClickOpening) => void;
  showTextTooltips?: boolean | undefined;
}

export const BookmarkCard = forwardRef<HTMLAnchorElement, BookmarkCardProps>(
  function BookmarkCard(
    {
      bookmark,
      faviconDisplay = 'available',
      missingFavicon = 'initials',
      opening,
      onOpen,
      showTextTooltips = false,
      ...anchorProps
    },
    ref,
  ) {
    const { t } = useTranslation();

    return (
      <a
        {...anchorProps}
        aria-label={t('bookmarks.open', { title: bookmark.title })}
        className="bookmark-card"
        data-context-menu="bookmark"
        data-item-id={bookmark.id}
        data-item-kind="bookmark"
        href={bookmark.url}
        onClick={(event) => {
          if (!onOpen) return;
          event.preventDefault();
          onOpen(bookmark, resolveBookmarkClickOpening(opening, event));
        }}
        rel="noreferrer"
        ref={ref}
        target={opening === 'new-tab' ? '_blank' : '_self'}
      >
        <span
          aria-hidden="true"
          className="bookmark-card__media"
          style={appearanceStyle(bookmark.cardAppearance)}
        />
        <span className="bookmark-card__details">
          {faviconDisplay === 'available' && bookmark.favicon ? (
            <span aria-hidden="true" className="bookmark-card__favicon">
              <img alt="" src={bookmark.favicon} />
            </span>
          ) : faviconDisplay === 'initials' || missingFavicon !== 'none' ? (
            <span aria-hidden="true" className="bookmark-card__favicon">
              {faviconDisplay !== 'initials' && missingFavicon === 'built-in'
                ? '◆'
                : titleInitials(bookmark.title, 'bookmark')}
            </span>
          ) : null}
          <span className="bookmark-card__copy">
            <strong title={showTextTooltips ? bookmark.title : undefined}>
              {bookmark.title}
            </strong>
            <span title={showTextTooltips ? bookmark.url : undefined}>
              {bookmark.url}
            </span>
          </span>
        </span>
      </a>
    );
  },
);
