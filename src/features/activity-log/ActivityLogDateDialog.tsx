import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ClearIcon } from '../../components/icons/ClearIcon';
import { NoteIcon } from '../../components/icons/NoteIcon';
import { setLogDialogOpen } from './native-dialog';
import {
  activityDatePreset,
  activityDatePresets,
  dayDate,
  localDay,
  mergeActivityDates,
  moveDay,
  type ActivityDateSelection,
} from '../../domain/activity-log-dates';

/** Draft calendar selection; only Apply changes the parent's transient filter. */
export function ActivityLogDateDialog({
  selection,
  activityDays,
  onApply,
  onClose,
}: {
  selection: ActivityDateSelection;
  activityDays: ReadonlySet<string>;
  onApply(value: ActivityDateSelection): void;
  onClose(): void;
}) {
  const { t, i18n } = useTranslation();
  const dialog = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState<ActivityDateSelection>(selection);
  const [mode, setMode] = useState<'individual' | 'range'>('individual');
  const [anchor, setAnchor] = useState<string | null>(null);
  const [preset, setPreset] = useState(selection === null ? 'all' : 'custom');
  const [focus, setFocus] = useState(() => localDay(new Date()));
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1, 12);
  });
  useEffect(() => {
    const element = dialog.current;
    setLogDialogOpen(element, true);
    element?.querySelector<HTMLSelectElement>('select')?.focus();
    return () => setLogDialogOpen(element, false);
  }, []);
  const label = (day: string) =>
    dayDate(day).toLocaleDateString(i18n.language, { dateStyle: 'full' });
  const select = (day: string) => {
    setPreset('custom');
    if (mode === 'range') {
      if (!anchor) {
        setAnchor(day);
        return;
      }
      setDraft(
        mergeActivityDates([...(draft ?? []), { from: anchor, to: day }]),
      );
      setAnchor(null);
    } else if (draft?.some(({ from, to }) => day >= from && day <= to)) {
      setDraft(
        draft.flatMap(({ from, to }) =>
          day < from || day > to
            ? [{ from, to }]
            : [
                ...(day > from ? [{ from, to: moveDay(day, -1) }] : []),
                ...(day < to ? [{ from: moveDay(day, 1), to }] : []),
              ],
        ),
      );
    } else
      setDraft(mergeActivityDates([...(draft ?? []), { from: day, to: day }]));
  };
  const focusDay = (day: string) => {
    setFocus(day);
    const date = dayDate(day);
    setMonth(new Date(date.getFullYear(), date.getMonth(), 1, 12));
    requestAnimationFrame(() =>
      dialog.current
        ?.querySelector<HTMLButtonElement>(`[data-day="${day}"]`)
        ?.focus(),
    );
  };
  return (
    <dialog
      ref={dialog}
      className="profile-window activity-date-dialog"
      aria-labelledby="activity-date-title"
      onCancel={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }}
    >
      <header className="profile-window__header">
        <h1 id="activity-date-title">{t('activityRebuild.dateTitle')}</h1>
        <button
          type="button"
          aria-label={t('activityRebuild.cancel')}
          onClick={onClose}
        >
          <ClearIcon />
        </button>
      </header>
      <div className="activity-date-dialog__content">
        <label>
          {t('activityRebuild.presets')}
          <select
            value={preset}
            onChange={(event) => {
              setPreset(event.target.value);
              if (event.target.value === 'custom') {
                setDraft([]);
                setAnchor(null);
                return;
              }
              setDraft(
                activityDatePreset(
                  event.target.value as (typeof activityDatePresets)[number],
                ),
              );
              setAnchor(null);
            }}
          >
            <option value="custom">{t('activityRebuild.custom')}</option>
            {activityDatePresets.map((preset) => (
              <option key={preset} value={preset}>
                {t(`activityRebuild.preset.${preset}`)}
              </option>
            ))}
          </select>
        </label>
        <fieldset>
          <legend>{t('activityRebuild.selectionMode')}</legend>
          {(['individual', 'range'] as const).map((value) => (
            <label className="settings-checkbox-row" key={value}>
              <input
                type="radio"
                name="activity-date-mode"
                checked={mode === value}
                onChange={() => {
                  setMode(value);
                  setAnchor(null);
                }}
              />
              {t(`activityRebuild.${value}`)}
            </label>
          ))}
        </fieldset>
        <details>
          <summary>{t('activityRebuild.keyboardHelp')}</summary>
          <p id="activity-calendar-help">{t('activityRebuild.calendarHelp')}</p>
        </details>
        <p role="status">
          {anchor
            ? t('activityRebuild.chooseEnd', { date: label(anchor) })
            : t('activityRebuild.activityMarker')}
        </p>
        <div className="activity-date-navigation">
          <button
            className="profile-button"
            type="button"
            onClick={() =>
              setMonth(
                new Date(month.getFullYear(), month.getMonth() - 1, 1, 12),
              )
            }
          >
            {t('activityRebuild.previous')}
          </button>
          <button
            className="profile-button"
            type="button"
            onClick={() =>
              setMonth(
                new Date(month.getFullYear(), month.getMonth() + 1, 1, 12),
              )
            }
          >
            {t('activityRebuild.next')}
          </button>
        </div>
        <div className="activity-date-months">
          {[0, 1].map((offset) => {
            const date = new Date(
              month.getFullYear(),
              month.getMonth() + offset,
              1,
              12,
            );
            const days = new Date(
              date.getFullYear(),
              date.getMonth() + 1,
              0,
            ).getDate();
            return (
              <section
                className={offset ? 'activity-date-second-month' : undefined}
                key={offset}
                aria-label={date.toLocaleDateString(i18n.language, {
                  month: 'long',
                  year: 'numeric',
                })}
              >
                <h2>
                  {date.toLocaleDateString(i18n.language, {
                    month: 'long',
                    year: 'numeric',
                  })}
                </h2>
                <div
                  role="grid"
                  aria-describedby="activity-calendar-help"
                  aria-label={date.toLocaleDateString(i18n.language, {
                    month: 'long',
                    year: 'numeric',
                  })}
                >
                  <div role="row">
                    {Array.from({ length: 7 }, (_, weekday) => (
                      <span
                        role="columnheader"
                        key={weekday}
                        aria-label={new Date(
                          2026,
                          0,
                          4 + weekday,
                        ).toLocaleDateString(i18n.language, {
                          weekday: 'long',
                        })}
                      >
                        {new Date(2026, 0, 4 + weekday).toLocaleDateString(
                          i18n.language,
                          { weekday: 'short' },
                        )}
                      </span>
                    ))}
                  </div>
                  {Array.from(
                    { length: Math.ceil((date.getDay() + days) / 7) },
                    (_, week) => (
                      <div role="row" key={week}>
                        {Array.from({ length: 7 }, (_, weekday) => {
                          const number = week * 7 + weekday - date.getDay() + 1;
                          if (number < 1 || number > days)
                            return <span role="gridcell" key={weekday} />;
                          const day = localDay(
                            new Date(
                              date.getFullYear(),
                              date.getMonth(),
                              number,
                              12,
                            ),
                          );
                          const selected =
                            draft?.some(
                              ({ from, to }) => day >= from && day <= to,
                            ) ?? false;
                          const hasActivity = activityDays.has(day);
                          return (
                            <span
                              role="gridcell"
                              aria-selected={selected}
                              key={weekday}
                            >
                              <button
                                className="profile-button"
                                type="button"
                                data-day={day}
                                tabIndex={
                                  focus === day ||
                                  (number === 1 &&
                                    (dayDate(focus).getMonth() !==
                                      date.getMonth() ||
                                      dayDate(focus).getFullYear() !==
                                        date.getFullYear()) &&
                                    offset === 0)
                                    ? 0
                                    : -1
                                }
                                aria-pressed={selected || anchor === day}
                                aria-label={`${label(day)}${hasActivity ? `, ${t('activityRebuild.hasActivity')}` : ''}${anchor === day ? `, ${t('activityRebuild.rangeStart')}` : ''}`}
                                onFocus={() => setFocus(day)}
                                onClick={() => select(day)}
                                onKeyDown={(event) => {
                                  const movements: Record<string, number> = {
                                    ArrowLeft: -1,
                                    ArrowRight: 1,
                                    ArrowUp: -7,
                                    ArrowDown: 7,
                                    Home: -weekday,
                                    End: 6 - weekday,
                                  };
                                  if (event.key in movements) {
                                    event.preventDefault();
                                    focusDay(
                                      moveDay(day, movements[event.key]!),
                                    );
                                  }
                                  if (
                                    event.key === 'PageUp' ||
                                    event.key === 'PageDown'
                                  ) {
                                    event.preventDefault();
                                    const next = dayDate(day);
                                    const number = next.getDate();
                                    next.setDate(1);
                                    next.setMonth(
                                      next.getMonth() +
                                        (event.key === 'PageUp' ? -1 : 1) *
                                          (event.shiftKey ? 12 : 1),
                                    );
                                    next.setDate(
                                      Math.min(
                                        number,
                                        new Date(
                                          next.getFullYear(),
                                          next.getMonth() + 1,
                                          0,
                                        ).getDate(),
                                      ),
                                    );
                                    focusDay(localDay(next));
                                  }
                                }}
                              >
                                <span className="activity-date-day-number">
                                  {number}
                                </span>
                                {hasActivity ? (
                                  <span
                                    className="activity-date-marker"
                                    aria-hidden="true"
                                  >
                                    <NoteIcon />
                                  </span>
                                ) : null}
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    ),
                  )}
                </div>
              </section>
            );
          })}
        </div>
        <div className="activity-date-chips">
          {draft === null ? (
            <div className="activity-date-chip">
              <span>{t('activityRebuild.preset.all')}</span>
            </div>
          ) : (
            draft.map((range, index) => (
              <div
                className="activity-date-chip"
                key={`${range.from}-${range.to}`}
              >
                <span>
                  {range.from === range.to
                    ? label(range.from)
                    : `${label(range.from)} - ${label(range.to)}`}
                </span>
                <button
                  className="profile-button profile-button--danger"
                  type="button"
                  aria-label={t('activityRebuild.removeDate', {
                    date: `${label(range.from)} - ${label(range.to)}`,
                  })}
                  onClick={() => {
                    setDraft(draft.filter((_, item) => item !== index));
                    // Keep keyboard focus on a remaining removal action or the preset.
                    requestAnimationFrame(() => {
                      const buttons =
                        dialog.current?.querySelectorAll<HTMLButtonElement>(
                          '.activity-date-chip button',
                        );
                      const target =
                        buttons?.[Math.min(index, buttons.length - 1)];
                      (
                        target ?? dialog.current?.querySelector('select')
                      )?.focus();
                    });
                  }}
                >
                  <ClearIcon />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
      <footer className="activity-log__footer">
        <button className="profile-button" type="button" onClick={onClose}>
          {t('activityRebuild.cancel')}
        </button>
        <button
          className="profile-button profile-button--primary"
          type="button"
          disabled={!!anchor || (draft !== null && !draft.length)}
          onClick={() => onApply(draft)}
        >
          {t('activityRebuild.apply')}
        </button>
      </footer>
    </dialog>
  );
}
