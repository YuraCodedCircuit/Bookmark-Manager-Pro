import { forwardRef, type AnchorHTMLAttributes } from 'react';
import { useTranslation } from 'react-i18next';

import type { Bookmark } from '../../domain/bookmark';
import { appearanceStyle } from '../../shared/appearance-style';

interface BookmarkCardProps extends Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  'href' | 'onClick' | 'rel' | 'target'
> {
  bookmark: Bookmark;
  faviconDisplay?: 'available' | 'initials' | undefined;
  missingFavicon?: 'built-in' | 'initials' | 'none' | undefined;
  opening: 'current-tab' | 'new-tab';
  onOpen?: (bookmark: Bookmark) => void;
}

export const BookmarkCard = forwardRef<HTMLAnchorElement, BookmarkCardProps>(
  function BookmarkCard(
    {
      bookmark,
      faviconDisplay = 'available',
      missingFavicon = 'initials',
      opening,
      onOpen,
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
          onOpen(bookmark);
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
                : bookmark.title.slice(0, 2).toUpperCase()}
            </span>
          ) : null}
          <span className="bookmark-card__copy">
            <strong>{bookmark.title}</strong>
            <span>{bookmark.url}</span>
          </span>
        </span>
      </a>
    );
  },
);
