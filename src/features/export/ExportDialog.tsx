import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ProfileListItem } from '../../application/profile/profile-management-repository';
import type { ExportProfiles } from '../../application/export/export-profiles';
import {
  createWorkerExportService,
  type ExportDownloadFile,
} from '../../platform/files/export-worker-client';
import {
  exportCategories,
  isValidExportPassword,
  type ExportCategory,
  type ExportFormat,
} from '../../domain/profile-export';
import { downloadExportFile } from '../../platform/files/download-export-file';
import { ClearableInput } from '../../components/ClearableInput';
import { PasswordVisibilityIcon } from '../../components/icons/PasswordVisibilityIcon';
import { ClearIcon } from '../../components/icons/ClearIcon';
import { ChevronIcon } from '../../components/icons/ChevronIcon';
import type { ExportEvent } from '../../application/export/report-export-event';
import {
  defaultExportPreferences,
  getCsvExportColumns,
  exportPreferencesSchema,
  type ExportPreferences,
} from '../../domain/csv-export';

export type ExportUiEvent = ExportEvent;
interface Props {
  preferences?: ExportPreferences;
  activeProfileId: string;
  loadProfiles: () => Promise<readonly ProfileListItem[]>;
  onClose: () => void;
  onReport: (event: ExportUiEvent) => void;
  service?: {
    create: (
      ...args: Parameters<ExportProfiles['create']>
    ) => Promise<ExportDownloadFile>;
  } & Partial<Pick<ExportProfiles, 'estimate'>>;
  download?: typeof downloadExportFile;
}

/** Keeps passwords and per-export choices transient while applying supplied saved CSV preferences. */
export function ExportDialog({
  preferences = defaultExportPreferences,
  activeProfileId,
  loadProfiles,
  onClose,
  onReport,
  service: suppliedService,
  download = downloadExportFile,
}: Props) {
  const { t } = useTranslation();
  const csvColumnsKey = JSON.stringify(preferences);
  const csvColumns = useMemo(
    () =>
      getCsvExportColumns(
        exportPreferencesSchema.parse(JSON.parse(csvColumnsKey)),
      ),
    [csvColumnsKey],
  );
  const [service] = useState<NonNullable<Props['service']>>(
    () => suppliedService ?? createWorkerExportService(),
  );
  const dialog = useRef<HTMLDialogElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const controller = useRef<AbortController | null>(null);
  const [profiles, setProfiles] = useState<readonly ProfileListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const [selected, setSelected] = useState([activeProfileId]);
  const [format, setFormat] = useState<ExportFormat>('bmpro');
  const [isProfilePickerOpen, setIsProfilePickerOpen] = useState(false);
  const profilePickerButton = useRef<HTMLButtonElement>(null);
  const wasProfilePickerOpen = useRef(false);
  const [categories, setCategories] = useState<ExportCategory[]>([
    ...exportCategories,
  ]);
  const [backups, setBackups] = useState(false);
  const [encrypted, setEncrypted] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  useEffect(() => {
    const hide = () => {
      controller.current?.abort();
      setPassword('');
      setConfirmation('');
      setShowPassword(false);
      setShowConfirmation(false);
    };
    window.addEventListener('pagehide', hide);
    return () => window.removeEventListener('pagehide', hide);
  }, []);
  const [completed, setCompleted] = useState(false);
  const footerCloseButton = useRef<HTMLButtonElement>(null);
  const exportButton = useRef<HTMLButtonElement>(null);
  const [estimate, setEstimate] = useState<number | null>(null);
  const [estimateFor, setEstimateFor] = useState('');
  const reportedEstimateFailure = useRef(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const callbacks = useRef({ loadProfiles, onReport });
  const report = (event: ExportUiEvent) => {
    try {
      callbacks.current.onReport(event);
    } catch {
      console.error('profile-export-feedback-failed');
    }
  };
  useEffect(() => {
    callbacks.current = { loadProfiles, onReport };
  }, [loadProfiles, onReport]);
  useEffect(() => {
    // The parent is inert until the child dialog's cleanup closes it.
    if (wasProfilePickerOpen.current && !isProfilePickerOpen)
      profilePickerButton.current?.focus();
    wasProfilePickerOpen.current = isProfilePickerOpen;
  }, [isProfilePickerOpen]);
  useEffect(() => {
    const previous = document.activeElement;
    const element = dialog.current!;
    element.showModal();
    closeButton.current?.focus();
    return () => {
      controller.current?.abort();
      element.close();
      if (previous instanceof HTMLElement && previous.isConnected)
        previous.focus();
    };
  }, []);
  useEffect(() => {
    let active = true;
    void callbacks.current
      .loadProfiles()
      .then((items) => {
        if (active) {
          setProfiles(items);
          setLoading(false);
          setLoadFailed(false);
        }
      })
      .catch(() => {
        if (active) {
          setLoading(false);
          setLoadFailed(true);
          try {
            callbacks.current.onReport('loadFailed');
          } catch {
            console.error('profile-export-feedback-failed');
          }
        }
      });
    return () => {
      active = false;
    };
  }, [retry]);
  const clearPassword = () => {
    setPassword('');
    setConfirmation('');
    setShowPassword(false);
    setShowConfirmation(false);
  };
  const close = () => {
    if (busy) return;
    clearPassword();
    onClose();
  };
  const passwordValid =
    !encrypted ||
    format !== 'bmpro' ||
    (isValidExportPassword(password) && password === confirmation);
  const passwordReady = Boolean(password && passwordValid);
  const submit = async () => {
    if (
      controller.current ||
      busy ||
      loading ||
      loadFailed ||
      !selected.length ||
      !passwordValid ||
      (format === 'bmpro' && !categories.length)
    )
      return;
    const abort = new AbortController();
    controller.current = abort;
    setCompleted(false);
    setBusy(true);
    setError('');
    setStatus(t('export.working'));
    report('started');
    try {
      const file = await service.create(
        {
          profileIds: selected,
          format,
          categories,
          includeBackups: backups,
          password: encrypted && format === 'bmpro' ? password : undefined,
          ...(format === 'csv' ? { csvColumns } : {}),
        },
        abort.signal,
        (done, total) => {
          if (!abort.signal.aborted)
            setStatus(t('export.progress', { done, total }));
        },
      );
      abort.signal.throwIfAborted();
      download(file);
      setStatus('');
      setEstimate(
        typeof file.content === 'string'
          ? new TextEncoder().encode(file.content).byteLength
          : file.content.size,
      );
      setCompleted(true);
      report('completed');
    } catch {
      if (abort.signal.aborted) {
        setStatus(t('export.cancelled'));
        report('cancelled');
      } else {
        setError(t('export.failed'));
        setStatus('');
        report('failed');
      }
    } finally {
      clearPassword();
      setBusy(false);
      controller.current = null;
    }
  };
  const markEdited = () => {
    setCompleted(false);
    setStatus('');
    setError('');
  };
  useEffect(() => {
    if (completed && !busy) {
      if (passwordValid) exportButton.current?.focus();
      else footerCloseButton.current?.focus();
    }
  }, [completed, busy, passwordValid]);
  const estimateKey = JSON.stringify([
    selected,
    format,
    categories,
    backups,
    encrypted,
    format === 'csv' ? csvColumns : null,
  ]);
  const canEstimate =
    Boolean(service.estimate) &&
    !loading &&
    !loadFailed &&
    selected.length > 0 &&
    (format !== 'bmpro' || categories.length > 0);
  const estimating =
    canEstimate && !busy && !completed && estimateFor !== estimateKey;
  const displayedEstimate =
    completed || estimateFor === estimateKey ? estimate : null;
  useEffect(() => {
    const abort = new AbortController();
    if (!canEstimate || busy || completed) return;
    // Coalesce changes to adjacent checkboxes without capturing password text.
    const timer = window.setTimeout(() => {
      void service.estimate!(
        {
          profileIds: selected,
          format,
          categories,
          includeBackups: backups,
          encrypted,
          ...(format === 'csv' ? { csvColumns } : {}),
        },
        abort.signal,
      )
        .then((bytes) => {
          if (!abort.signal.aborted) {
            setEstimate(bytes);
            setEstimateFor(estimateKey);
          }
        })
        .catch(() => {
          if (!abort.signal.aborted) {
            setEstimate(null);
            setEstimateFor(estimateKey);
            if (!reportedEstimateFailure.current) {
              console.warn('profile-export-estimate-unavailable');
              reportedEstimateFailure.current = true;
            }
          }
        });
    }, 250);
    return () => {
      window.clearTimeout(timer);
      abort.abort();
    };
  }, [
    service,
    canEstimate,
    selected,
    format,
    categories,
    backups,
    encrypted,
    busy,
    completed,
    estimateKey,
    csvColumns,
  ]);
  const selectedSummary =
    selected.length === 1
      ? (profiles.find((item) => item.profile.id === selected[0])?.profile
          .username ?? t('export.selectedProfiles', { count: selected.length }))
      : t('export.selectedProfiles', { count: selected.length });
  return (
    <dialog
      className="backup-dialog export-dialog"
      aria-labelledby="export-title"
      aria-describedby="export-description"
      ref={dialog}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) close();
      }}
    >
      <form
        className="backup-dialog__main"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <header className="backup-dialog__header">
          <div>
            <h1 id="export-title">{t('export.title')}</h1>
            <p id="export-description">{t('export.description')}</p>
          </div>
          <button
            className="backup-dialog__close"
            type="button"
            aria-label={t('export.close')}
            ref={closeButton}
            disabled={busy}
            onClick={close}
          >
            <ClearIcon />
          </button>
        </header>
        <div className="export-dialog__body">
          {loading ? <p role="status">{t('export.loading')}</p> : null}
          {loadFailed ? (
            <div role="alert">
              <p>{t('export.loadFailed')}</p>
              <button
                type="button"
                onClick={() => {
                  setLoading(true);
                  setLoadFailed(false);
                  setRetry((value) => value + 1);
                }}
              >
                {t('export.retry')}
              </button>
            </div>
          ) : null}
          <div className="export-dialog__grid">
            <section
              className="export-dialog__section"
              aria-labelledby="export-profile-heading"
            >
              <h2 id="export-profile-heading">
                <span aria-hidden="true">1.</span> {t('export.selectProfiles')}
              </h2>
              <button
                className="export-dialog__profile-button"
                type="button"
                ref={profilePickerButton}
                aria-haspopup="dialog"
                aria-label={t('export.selectProfiles')}
                aria-describedby="export-profile-summary"
                title={selectedSummary}
                disabled={busy || loading || loadFailed}
                onClick={() => setIsProfilePickerOpen(true)}
              >
                <span id="export-profile-summary">
                  {loading ? t('export.loading') : selectedSummary}
                </span>
                <ChevronIcon />
              </button>
            </section>
            <section
              className="export-dialog__section"
              aria-labelledby="export-format-heading"
            >
              <h2 id="export-format-heading">
                <span aria-hidden="true">2.</span>{' '}
                <label htmlFor="export-format">
                  {t('export.chooseFormat')}
                </label>
              </h2>
              <select
                id="export-format"
                value={format}
                disabled={busy}
                onChange={(event) => {
                  markEdited();
                  setFormat(event.target.value as ExportFormat);
                  clearPassword();
                  setEncrypted(false);
                }}
              >
                {(['bmpro', 'json', 'csv', 'html'] as const).map((value) => (
                  <option value={value} key={value}>
                    {t(`export.formats.${value}`)}
                  </option>
                ))}
              </select>
            </section>
            <section
              className="export-dialog__section"
              aria-labelledby="export-data-heading"
            >
              <h2 id="export-data-heading">
                <span aria-hidden="true">3.</span> {t('export.includeData')}
              </h2>
              <fieldset
                className="export-dialog__data-list"
                disabled={busy}
                aria-labelledby="export-data-heading"
              >
                {exportCategories.map((category) => (
                  <label className="settings-checkbox-row" key={category}>
                    <input
                      type="checkbox"
                      disabled={format !== 'bmpro'}
                      checked={
                        format === 'bmpro'
                          ? categories.includes(category)
                          : category === 'bookmarks'
                      }
                      onChange={(event) =>
                        setCategories((current) =>
                          event.target.checked
                            ? [...current, category]
                            : current.filter((value) => value !== category),
                        )
                      }
                    />
                    <span>
                      {t(
                        category === 'bookmarks' && format !== 'bmpro'
                          ? format === 'csv'
                            ? 'export.csvBookmarks'
                            : 'export.portableBookmarks'
                          : `export.categories.${category}`,
                      )}
                    </span>
                  </label>
                ))}
                <label className="settings-checkbox-row export-dialog__backup-option">
                  <input
                    type="checkbox"
                    disabled={format !== 'bmpro'}
                    checked={format === 'bmpro' && backups}
                    onChange={(event) => {
                      markEdited();
                      setBackups(event.target.checked);
                    }}
                  />
                  <span>{t('export.backups')}</span>
                </label>
              </fieldset>
              <p className="export-dialog__notice is-neutral">
                {t(`export.formatSummaries.${format}`)}
              </p>
              {format === 'bmpro' && backups ? (
                <p className="export-dialog__notice is-neutral">
                  {t('export.backupsHelp')}
                </p>
              ) : null}
            </section>
            <section
              className="export-dialog__section"
              aria-labelledby="export-encryption-heading"
            >
              <h2
                id="export-encryption-heading"
                className="export-dialog__encryption-heading"
              >
                <span aria-hidden="true">4.</span>
                <label className="settings-checkbox-row">
                  <input
                    type="checkbox"
                    checked={encrypted}
                    disabled={busy || format !== 'bmpro'}
                    onChange={(event) => {
                      markEdited();
                      setEncrypted(event.target.checked);
                      clearPassword();
                    }}
                  />
                  <span>{t('export.encrypt')}</span>
                </label>
              </h2>
              <fieldset
                className="export-dialog__password-fields"
                disabled={busy || !encrypted || format !== 'bmpro'}
                aria-labelledby="export-encryption-heading"
              >
                <label className="export-dialog__field">
                  <span>{t('export.password')}</span>
                  <span
                    className="clearable-input export-password-input"
                    data-has-value={Boolean(password)}
                  >
                    <ClearableInput
                      aria-describedby="export-password-help export-password-mismatch"
                      aria-invalid={Boolean(
                        password && !isValidExportPassword(password),
                      )}
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      spellCheck={false}
                      value={password}
                      clearLabel={t('export.clearPassword')}
                      onChange={(event) => {
                        markEdited();
                        setPassword(event.target.value);
                      }}
                    />
                    <button
                      className="clearable-input__button export-password-input__visibility"
                      type="button"
                      aria-pressed={showPassword}
                      aria-label={t(
                        showPassword
                          ? 'export.hidePassword'
                          : 'export.showPasswordInput',
                      )}
                      onClick={() => setShowPassword((value) => !value)}
                    >
                      <PasswordVisibilityIcon revealed={showPassword} />
                    </button>
                  </span>
                </label>
                <label className="export-dialog__field">
                  <span>{t('export.confirmPassword')}</span>
                  <span
                    className="clearable-input export-password-input"
                    data-has-value={Boolean(confirmation)}
                  >
                    <ClearableInput
                      aria-describedby="export-password-help export-password-mismatch"
                      aria-invalid={Boolean(
                        confirmation && password !== confirmation,
                      )}
                      type={showConfirmation ? 'text' : 'password'}
                      autoComplete="new-password"
                      spellCheck={false}
                      value={confirmation}
                      clearLabel={t('export.clearConfirmation')}
                      onChange={(event) => {
                        markEdited();
                        setConfirmation(event.target.value);
                      }}
                    />
                    <button
                      className="clearable-input__button export-password-input__visibility"
                      type="button"
                      aria-pressed={showConfirmation}
                      aria-label={t(
                        showConfirmation
                          ? 'export.hideConfirmation'
                          : 'export.showConfirmation',
                      )}
                      onClick={() => setShowConfirmation((value) => !value)}
                    >
                      <PasswordVisibilityIcon revealed={showConfirmation} />
                    </button>
                  </span>
                </label>
              </fieldset>
              <ul
                id="export-password-mismatch"
                aria-live="polite"
                aria-label={t('export.passwordRequirements')}
                className={`export-dialog__checklist ${passwordReady ? 'is-success' : ''}`}
              >
                {(
                  [
                    ['passwordAllowed', isValidExportPassword(password)],
                    [
                      'passwordMatchRule',
                      Boolean(
                        password && confirmation && password === confirmation,
                      ),
                    ],
                  ] as const
                ).map(([rule, met]) => (
                  <li key={rule} className={met ? 'is-success' : ''}>
                    <ExportNoticeIcon kind={met ? 'success' : 'error'} />
                    <span className="export-dialog__notice-text">
                      <span className="visually-hidden">
                        {t(
                          met
                            ? 'export.requirementMet'
                            : 'export.requirementUnmet',
                        )}{' '}
                      </span>
                      {t(`export.${rule}`)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
          <p
            className={`export-dialog__notice ${encrypted ? 'is-neutral' : 'is-warning'}`}
            id="export-password-help"
          >
            {!encrypted ? <ExportNoticeIcon kind="warning" /> : null}
            <span className="export-dialog__notice-text">
              {t(encrypted ? 'export.passwordRecovery' : 'export.unencrypted')}
            </span>
          </p>
          <details className="export-dialog__details">
            <summary>{t('export.moreDetails')}</summary>
            <p>{t('export.limit')}</p>
          </details>
          {error ? <p role="alert">{error}</p> : null}
          <p className="export-dialog__status" role="status" aria-live="polite">
            {status}
          </p>
        </div>
        <footer className="backup-dialog__footer export-dialog__footer">
          <div className="export-dialog__footer-summary">
            <p className="export-dialog__estimate">
              {t(completed ? 'export.actualSize' : 'export.estimatedSize', {
                size:
                  displayedEstimate !== null
                    ? new Intl.NumberFormat(undefined, {
                        style: 'unit',
                        unit:
                          displayedEstimate! < 1024
                            ? 'byte'
                            : displayedEstimate! < 1024 * 1024
                              ? 'kilobyte'
                              : 'megabyte',
                        unitDisplay: 'short',
                        maximumFractionDigits: 1,
                      }).format(
                        displayedEstimate! < 1024
                          ? displayedEstimate!
                          : displayedEstimate! < 1024 * 1024
                            ? displayedEstimate! / 1024
                            : displayedEstimate! / (1024 * 1024),
                      )
                    : t(
                        estimating
                          ? 'export.calculatingSize'
                          : 'export.sizeUnavailable',
                      ),
              })}
            </p>
          </div>
          <div className="export-dialog__footer-actions">
            <button
              ref={footerCloseButton}
              type="button"
              onClick={() => {
                if (busy) {
                  controller.current?.abort();
                  clearPassword();
                } else close();
              }}
            >
              {t(completed ? 'export.closeAction' : 'export.cancel')}
            </button>
            <button
              ref={exportButton}
              aria-busy={busy}
              type="submit"
              className="is-primary"
              disabled={
                busy ||
                loading ||
                loadFailed ||
                !selected.length ||
                !passwordValid ||
                (format === 'bmpro' && !categories.length)
              }
            >
              {t('export.title')}
            </button>
          </div>
        </footer>
      </form>
      {isProfilePickerOpen ? (
        <ExportProfilePicker
          profiles={profiles}
          selected={selected}
          onChange={(ids) => {
            markEdited();
            setSelected(ids);
          }}
          onClose={() => {
            setIsProfilePickerOpen(false);
          }}
        />
      ) : null}
    </dialog>
  );
}

function ExportNoticeIcon({ kind }: { kind: 'success' | 'error' | 'warning' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      {kind === 'warning' ? (
        <path d="M12 3 22 21H2L12 3Z" />
      ) : (
        <circle cx="12" cy="12" r="9" />
      )}
      {kind === 'success' ? (
        <path d="m7 12 3 3 7-7" />
      ) : kind === 'error' ? (
        <path d="m8 8 8 8m0-8-8 8" />
      ) : (
        <path d="M12 9v5m0 3v1" />
      )}
    </svg>
  );
}

/** Profile selection stays transient; closing returns focus to its invoking button. */
function ExportProfilePicker({
  profiles,
  selected,
  onChange,
  onClose,
}: {
  profiles: readonly ProfileListItem[];
  selected: string[];
  onChange: (ids: string[]) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const dialog = useRef<HTMLDialogElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const element = dialog.current!;
    element.showModal();
    close.current?.focus();
    return () => element.close();
  }, []);
  return (
    <dialog
      className="backup-dialog export-profile-picker"
      aria-labelledby="export-profile-picker-title"
      ref={dialog}
      onCancel={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }}
    >
      <div className="backup-dialog__main">
        <header className="backup-dialog__header">
          <h1 id="export-profile-picker-title">{t('export.selectProfiles')}</h1>
          <button
            className="backup-dialog__close"
            type="button"
            aria-label={t('export.closeProfilePicker')}
            ref={close}
            onClick={onClose}
          >
            <ClearIcon />
          </button>
        </header>
        <fieldset className="export-profile-picker__list">
          <legend className="visually-hidden">{t('export.profiles')}</legend>
          {profiles.map(({ profile, isActive, bookmarkCount, folderCount }) => (
            <label
              className="settings-checkbox-row export-profile-picker__row"
              key={profile.id}
            >
              <input
                type="checkbox"
                aria-labelledby={`export-profile-name-${profile.id}`}
                aria-describedby={`export-profile-meta-${profile.id}`}
                checked={selected.includes(profile.id)}
                onChange={(event) =>
                  onChange(
                    event.target.checked
                      ? [...selected, profile.id]
                      : selected.filter((id) => id !== profile.id),
                  )
                }
              />
              <span className="export-profile-picker__identity">
                <strong id={`export-profile-name-${profile.id}`}>
                  {profile.username}
                </strong>
                <span
                  className="export-profile-picker__meta"
                  id={`export-profile-meta-${profile.id}`}
                >
                  {isActive ? (
                    <span className="profile-status">
                      {t('profiles.active')}
                    </span>
                  ) : null}
                  <span>
                    {t('export.profileCounts', {
                      bookmarks: bookmarkCount,
                      folders: folderCount,
                    })}
                  </span>
                </span>
              </span>
            </label>
          ))}
        </fieldset>
        <footer className="backup-dialog__footer">
          <p className="export-profile-picker__count" role="status">
            {t('export.profileSelectionCount', {
              selected: selected.length,
              count: profiles.length,
            })}
          </p>
          <button type="button" onClick={onClose}>
            {t('export.closeAction')}
          </button>
        </footer>
      </div>
    </dialog>
  );
}
