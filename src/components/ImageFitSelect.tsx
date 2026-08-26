import { useTranslation } from 'react-i18next';
import type { ImageFit } from '../domain/bookmark';

export function ImageFitSelect({
  value,
  onChange,
}: {
  value: ImageFit;
  onChange: (value: ImageFit) => void;
}) {
  const { t } = useTranslation();
  return (
    <label>
      <span>{t('contentEditor.imageFit')}</span>
      <select
        onChange={(event) => onChange(event.target.value as ImageFit)}
        value={value}
      >
        {(['fill', 'fit', 'stretch', 'tile', 'center', 'span'] as const).map(
          (fit) => (
            <option key={fit} value={fit}>
              {t(`contentEditor.imageFits.${fit}`)}
            </option>
          ),
        )}
      </select>
    </label>
  );
}
