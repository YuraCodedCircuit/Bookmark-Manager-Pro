import { useTranslation } from 'react-i18next';
import type { ActivityLogSettings } from '../../domain/activity-log';

/** Supplies native form fields; all edits wait for Settings Save. */
export function ActivitySettingsPanel({
  value,
}: {
  value: ActivityLogSettings;
}) {
  const { t } = useTranslation();
  return (
    <>
      <fieldset>
        <legend>{t('displaySettings.activity.thisProfile')}</legend>
        <label className="settings-checkbox-row">
          <input
            defaultChecked={value.enabled}
            name="activityLogEnabled"
            type="checkbox"
          />
          <span>{t('displaySettings.activity.enabled')}</span>
        </label>
        <p className="settings-dialog__help">
          {t('displaySettings.activity.help')}
        </p>
      </fieldset>
      <fieldset>
        <legend>{t('displaySettings.activity.shared')}</legend>
        <p className="settings-dialog__help">
          {t('displaySettings.activity.sharedHelp')}
        </p>
        {(
          ['activityEnabled', 'diagnosticsEnabled', 'autoDeleteOldest'] as const
        ).map((key) => (
          <label className="settings-checkbox-row" key={key}>
            <input type="checkbox" name={key} defaultChecked={value[key]} />
            <span>
              {t(
                `activityLog.settings.${key === 'activityEnabled' ? 'activity' : key === 'diagnosticsEnabled' ? 'diagnostics' : 'autoDelete'}`,
              )}
            </span>
          </label>
        ))}
        <label className="settings-dialog__field">
          <span>{t('activityLog.settings.minimumLevel')}</span>
          <select name="minimumLevel" defaultValue={value.minimumLevel}>
            {['INFO', 'WARN', 'ERROR'].map((level) => (
              <option key={level} value={level}>
                {t(`activityLog.levels.${level.toLowerCase()}`)}
              </option>
            ))}
          </select>
        </label>
        <p className="settings-dialog__help">
          {t('displaySettings.activity.recordingHelp')}
        </p>
        <label className="settings-dialog__field">
          <span>{t('activityLog.settings.retention')}</span>
          <input
            type="number"
            name="retentionCount"
            min="100"
            max="100000"
            step="1"
            required
            defaultValue={value.retentionCount}
          />
        </label>
        <label className="settings-dialog__field">
          <span>{t('activityLog.settings.maximumSize')}</span>
          <input
            type="number"
            name="maximumStorageMb"
            min="1"
            max="100"
            step="1"
            required
            defaultValue={value.maximumStorageMb}
          />
        </label>
        <fieldset className="settings-activity-categories">
          <legend>{t('activityRebuild.recordCategories')}</legend>
          {(['Application', 'Bookmarks', 'Notes', 'Profiles'] as const).map(
            (category) => (
              <label className="settings-checkbox-row" key={category}>
                <input
                  type="checkbox"
                  name="enabledCategories"
                  value={category}
                  defaultChecked={value.enabledCategories.includes(category)}
                />
                <span>
                  {t(`activityLog.categories.${category.toLowerCase()}`)}
                </span>
              </label>
            ),
          )}
        </fieldset>
      </fieldset>
    </>
  );
}
