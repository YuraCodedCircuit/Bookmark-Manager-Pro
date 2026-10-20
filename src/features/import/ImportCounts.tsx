import { useTranslation } from 'react-i18next';

/** Formats bookmark and folder counts with localized singular/plural units. */
export function ImportCounts({
  bookmarks,
  folders,
}: {
  bookmarks: number;
  folders: number;
}) {
  const { t } = useTranslation();
  return (
    <>
      {t('import.bookmarkCount', { count: bookmarks })}
      {' · '}
      {t('import.folderCount', { count: folders })}
    </>
  );
}
