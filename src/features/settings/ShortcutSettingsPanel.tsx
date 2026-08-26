import { Fragment, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  bindingFromKeyboardEvent,
  defaultShortcutBindings,
  hasCustomizedShortcuts,
  isReservedShortcut,
  shortcutActions,
  type ShortcutAction,
  type ShortcutPreferences,
} from '../../domain/keyboard-shortcuts';

interface ShortcutSettingsPanelProps {
  onChange: (preferences: ShortcutPreferences) => void;
  preferences: ShortcutPreferences;
}

export function ShortcutSettingsPanel({
  onChange,
  preferences,
}: ShortcutSettingsPanelProps) {
  const { t } = useTranslation();
  const [recording, setRecording] = useState<ShortcutAction>();
  const [error, setError] = useState<{
    action: ShortcutAction;
    kind: 'conflict' | 'invalid' | 'reserved';
  }>();

  const updateBinding = (action: ShortcutAction, binding: string) => {
    onChange({
      ...preferences,
      bindings: { ...preferences.bindings, [action]: binding },
    });
    setError(undefined);
    setRecording(undefined);
  };

  return (
    <section aria-labelledby="settings-shortcuts-title" key="shortcuts">
      <div className="settings-dialog__section-heading">
        <h2 id="settings-shortcuts-title">
          {t('displaySettings.category.shortcuts')}
        </h2>
        <p>{t('displaySettings.shortcuts.description')}</p>
      </div>
      <fieldset className="shortcut-settings">
        <legend>{t('displaySettings.shortcuts.group')}</legend>
        <div className="shortcut-settings__toolbar">
          <label className="settings-checkbox-row">
            <input
              checked={preferences.enabled}
              name="shortcutsEnabled"
              onChange={(event) =>
                onChange({
                  ...preferences,
                  enabled: event.currentTarget.checked,
                })
              }
              type="checkbox"
            />
            <span>{t('displaySettings.shortcuts.enabled')}</span>
          </label>
          {hasCustomizedShortcuts(preferences.bindings) ? (
            <button
              className="shortcut-settings__button shortcut-settings__restore-all"
              onClick={() => {
                onChange({
                  ...preferences,
                  bindings: defaultShortcutBindings,
                });
                setError(undefined);
                setRecording(undefined);
              }}
              type="button"
            >
              {t('displaySettings.shortcuts.restoreAll')}
            </button>
          ) : null}
        </div>
        <div className="shortcut-settings__table-wrap">
          <table className="shortcut-settings__table">
            <thead>
              <tr>
                <th scope="col">{t('displaySettings.shortcuts.action')}</th>
                <th scope="col">{t('displaySettings.shortcuts.binding')}</th>
                <th scope="col">{t('displaySettings.shortcuts.restore')}</th>
              </tr>
            </thead>
            <tbody>
              {shortcutActions.map((action) => {
                const changed =
                  preferences.bindings[action] !==
                  defaultShortcutBindings[action];
                return (
                  <Fragment key={action}>
                    <tr>
                      <th scope="row">
                        {t(`displaySettings.shortcuts.actions.${action}`)}
                      </th>
                      <td>
                        <button
                          aria-describedby={
                            error?.action === action
                              ? `shortcut-error-${action}`
                              : undefined
                          }
                          aria-label={t('displaySettings.shortcuts.change', {
                            action: t(
                              `displaySettings.shortcuts.actions.${action}`,
                            ),
                          })}
                          className="shortcut-settings__button shortcut-settings__binding"
                          onClick={() => {
                            setError(undefined);
                            setRecording(action);
                          }}
                          onKeyDown={(event) => {
                            if (recording !== action) return;
                            event.preventDefault();
                            event.stopPropagation();
                            if (event.key === 'Escape') {
                              setError(undefined);
                              setRecording(undefined);
                              return;
                            }
                            const binding = bindingFromKeyboardEvent(
                              event.nativeEvent,
                            );
                            if (!binding) {
                              setError({ action, kind: 'invalid' });
                              return;
                            }
                            if (isReservedShortcut(binding)) {
                              setError({ action, kind: 'reserved' });
                              return;
                            }
                            const conflict = shortcutActions.some(
                              (candidate) =>
                                candidate !== action &&
                                preferences.bindings[candidate] === binding,
                            );
                            if (conflict) {
                              setError({ action, kind: 'conflict' });
                              return;
                            }
                            updateBinding(action, binding);
                          }}
                          type="button"
                        >
                          <kbd>
                            {recording === action
                              ? t('displaySettings.shortcuts.pressKeys')
                              : preferences.bindings[action]}
                          </kbd>
                        </button>
                      </td>
                      <td>
                        <button
                          className="shortcut-settings__button shortcut-settings__restore"
                          disabled={!changed}
                          onClick={() =>
                            updateBinding(
                              action,
                              defaultShortcutBindings[action],
                            )
                          }
                          type="button"
                        >
                          {t('displaySettings.shortcuts.restore')}
                        </button>
                      </td>
                    </tr>
                    {error?.action === action ? (
                      <tr className="shortcut-settings__error-row">
                        <td colSpan={3}>
                          <p
                            className="shortcut-settings__error"
                            id={`shortcut-error-${action}`}
                            role="alert"
                          >
                            {t(`displaySettings.shortcuts.${error.kind}`)}
                          </p>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="settings-dialog__help">
          {t('displaySettings.shortcuts.help')}
        </p>
      </fieldset>
    </section>
  );
}
