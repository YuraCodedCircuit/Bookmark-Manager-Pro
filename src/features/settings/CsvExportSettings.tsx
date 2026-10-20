import { useTranslation } from 'react-i18next';
import {
  csvColumnHeaders,
  defaultExportPreferences,
  getCsvExportColumns,
  type ExportPreferences,
} from '../../domain/csv-export';

/** Edits profile-local CSV preferences without persisting until Settings is saved. */
export function CsvExportSettings({
  value,
  onChange,
}: {
  value: ExportPreferences;
  onChange: (value: ExportPreferences) => void;
}) {
  const { t } = useTranslation();
  const prefix = 'displaySettings.exportSettings.';
  return (
    <section aria-labelledby="settings-export-title">
      <div className="settings-dialog__section-heading">
        <h2 id="settings-export-title">
          {t('displaySettings.category.export')}
        </h2>
        <p>{t(prefix + 'description')}</p>
      </div>
      <fieldset>
        <legend>{t(prefix + 'columns')}</legend>
        <div className="csv-export-columns">
          {value.csvColumnOrder.map((column, index) => (
            <div key={column} className="csv-export-columns__row">
              <label className="settings-checkbox-row">
                <input
                  type="checkbox"
                  checked={value.csvEnabledColumns.includes(column)}
                  disabled={column === 'url'}
                  onChange={(event) =>
                    onChange({
                      ...value,
                      csvEnabledColumns: event.target.checked
                        ? [...value.csvEnabledColumns, column]
                        : value.csvEnabledColumns.filter(
                            (item) => item !== column,
                          ),
                    })
                  }
                />
                <span>{t(prefix + 'labels.' + column)}</span>
              </label>
              {([-1, 1] as const).map((direction) => (
                <button
                  type="button"
                  key={direction}
                  disabled={
                    index + direction < 0 ||
                    index + direction >= value.csvColumnOrder.length
                  }
                  aria-label={t(
                    prefix +
                      (direction === -1 ? 'moveUpLabel' : 'moveDownLabel'),
                    { column: t(prefix + 'labels.' + column) },
                  )}
                  onClick={() => {
                    const order = [...value.csvColumnOrder];
                    [order[index], order[index + direction]] = [
                      order[index + direction]!,
                      order[index]!,
                    ];
                    onChange({ ...value, csvColumnOrder: order });
                  }}
                >
                  {t(prefix + (direction === -1 ? 'moveUp' : 'moveDown'))}
                </button>
              ))}
            </div>
          ))}
        </div>
        <p className="settings-dialog__help">{t(prefix + 'required')}</p>
        <p role="status" className="visually-hidden">
          {t(prefix + 'orderStatus', {
            columns: getCsvExportColumns(value)
              .map((column) => csvColumnHeaders[column])
              .join(', '),
          })}
        </p>
        <p className="settings-dialog__help">{t(prefix + 'importHelp')}</p>
        <label className="csv-export-preview">
          <span>{t(prefix + 'preview')}</span>
          <input
            readOnly
            value={getCsvExportColumns(value)
              .map((column) => csvColumnHeaders[column])
              .join(',')}
          />
        </label>
        <button
          type="button"
          className="csv-export-restore"
          onClick={() =>
            onChange({
              csvColumnOrder: [...defaultExportPreferences.csvColumnOrder],
              csvEnabledColumns: [
                ...defaultExportPreferences.csvEnabledColumns,
              ],
            })
          }
        >
          {t(prefix + 'restore')}
        </button>
      </fieldset>
    </section>
  );
}
