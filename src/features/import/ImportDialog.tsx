import { ImportFooter } from './ImportFooter';
import { ImportCounts } from './ImportCounts';
import { ImportFilter } from './ImportFilter';
import type { CsvColumn } from '../../domain/csv-export';
import type { ExportPayload } from '../../domain/profile-export';
import type {
  ImportWriter,
  ImportSavePlan,
  ImportRequest,
} from '../../application/import/import-writer';
import { createImportWriter } from '../../application/import/create-import-writer';
import { includedPortableItems } from '../../domain/portable-import';
import { useEffect, useRef, useState } from 'react';
import {
  defaultImportPreferences,
  type ImportPreferences,
} from '../../domain/profile-settings';
import { useTranslation } from 'react-i18next';
import { ClearIcon } from '../../components/icons/ClearIcon';
import { ChevronIcon } from '../../components/icons/ChevronIcon';
import { NoteIcon } from '../../components/icons/NoteIcon';
import { ProfileIcon } from '../../components/icons/ProfileIcon';
import {
  PortableImportPanel,
  type ImportDestinations,
} from './PortableImportPanel';
import type { PortableImportItem } from '../../domain/portable-import';
import { ImportChild } from './ImportChild';
import { PasswordVisibilityIcon } from '../../components/icons/PasswordVisibilityIcon';
import { ClearableInput } from '../../components/ClearableInput';
import { useFileInputCancelRef } from '../../shared/file-input-cancel';
import { ImportFilename } from './ImportFilename';
import type { ImportValidationEvent } from '../../application/import/native-import-session';
import {
  createNativePreviewClient,
  type NativePreviewClient,
  type NativePreviewMessage,
  type NativeProfilePreview,
} from './native-preview-client';

interface Props {
  onClose: () => void;
  onReport: (event: ImportValidationEvent) => void;
  createClient?: typeof createNativePreviewClient;
  destinations?: ImportDestinations;
  preferences?: ImportPreferences;
  writer?: ImportWriter;
  onImported?: (profileIds: string[]) => Promise<void>;
}

/** Owns in-memory review and cancels dialog-scoped persistence on closure or source replacement. */
export function ImportDialog({
  onClose,
  onReport,
  destinations,
  preferences = defaultImportPreferences,
  createClient = createNativePreviewClient,
  writer,
  onImported,
}: Props) {
  const { t } = useTranslation();
  const fileInputRef = useFileInputCancelRef<HTMLInputElement>();
  const writerRef = useRef<ImportWriter | null>(null);
  useEffect(() => {
    const service = writer ?? createImportWriter();
    writerRef.current = service;
    return () => {
      service.close();
      writerRef.current = null;
    };
  }, [writer]);
  const source = useRef<
    | { kind: 'native'; payload: ExportPayload }
    | { kind: 'portable'; items: PortableImportItem[] }
    | null
  >(null);
  const [hasContent, setHasContent] = useState(false);
  const operation = useRef<AbortController | null>(null);
  const [busy, setBusy] = useState<'preparing' | 'saving' | null>(null);
  const [plan, setPlan] = useState<ImportSavePlan | null>(null);
  const [portableSelection, setPortableSelection] = useState<{
    profileId: string;
    folderId: string;
    selected: string[];
  } | null>(null);
  const importButton = useRef<HTMLButtonElement>(null);
  const saveFocus = useRef<'import' | 'close' | null>(null);
  useEffect(() => {
    if (plan !== null || saveFocus.current === null) return;
    const target = saveFocus.current === 'import' ? importButton : closeButton;
    saveFocus.current = null;
    target.current?.focus();
  }, [plan]);
  const dialog = useRef<HTMLDialogElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const profileButton = useRef<HTMLButtonElement>(null);
  const unlockButton = useRef<HTMLButtonElement>(null);
  const client = useRef<NativePreviewClient | null>(null);
  const generation = useRef(0);
  const phaseRef = useRef('empty');
  const returnFocus = useRef<'profiles' | 'unlock' | null>(null);
  const reportRef = useRef(onReport);
  const [phase, setPhase] = useState<
    'empty' | 'checking' | 'locked' | 'ready' | 'failed'
  >('empty');
  const [portableItems, setPortableItems] = useState<
    PortableImportItem[] | null
  >(null);
  const [profiles, setProfiles] = useState<NativeProfilePreview[]>([]);
  const [fileName, setFileName] = useState('');
  const [portableCounts, setPortableCounts] = useState({
    bookmarks: 0,
    folders: 0,
  });
  const [portableFormat, setPortableFormat] = useState<'json' | 'html' | 'csv'>(
    'json',
  );
  const [selected, setSelected] = useState<string[]>([]);
  const [portableColumns, setPortableColumns] = useState<CsvColumn[]>([]);
  const [child, setChild] = useState<'profiles' | 'unlock' | null>(null);
  const [unlockFailed, setUnlockFailed] = useState(false);
  const [unlockBusy, setUnlockBusy] = useState(false);
  useEffect(() => {
    reportRef.current = onReport;
  }, [onReport]);
  const report = (event: ImportValidationEvent) => {
    try {
      reportRef.current(event);
    } catch {
      console.error('import-feedback-failed');
    }
  };
  const stop = () => {
    if (operation.current)
      report({ level: 'WARN', code: 'import.save.cancelled' });
    operation.current?.abort();
    operation.current = null;
    source.current = null;
    generation.current += 1;
    client.current?.terminate();
    client.current = null;
    if (phaseRef.current !== 'empty' && phaseRef.current !== 'failed')
      report({ level: 'WARN', code: 'import.validation.cancelled' });
    phaseRef.current = 'empty';
  };
  const lifecycle = useRef(stop);
  useEffect(() => {
    lifecycle.current = stop;
  });
  useEffect(() => {
    const previous = document.activeElement;
    const element = dialog.current!;
    element.showModal();
    closeButton.current?.focus();
    const discard = () => lifecycle.current();
    const hide = () => {
      discard();
      setFileName('');
      setProfiles([]);
      setPortableItems(null);
      setSelected([]);
      setChild(null);
      setPhase('empty');
      setUnlockBusy(false);
      setPlan(null);
      setBusy(null);
      setPortableSelection(null);
      setHasContent(false);
    };
    window.addEventListener('pagehide', hide);
    return () => {
      discard();
      window.removeEventListener('pagehide', hide);
      element.close();
      if (previous instanceof HTMLElement && previous.isConnected)
        previous.focus();
    };
  }, []);
  useEffect(() => {
    if (child !== null || returnFocus.current === null) return;
    // Focus after the child cleanup closes its native dialog and removes inertness.
    const target =
      returnFocus.current === 'profiles' ? profileButton : unlockButton;
    returnFocus.current = null;
    (target.current ?? closeButton.current)?.focus();
  }, [child, phase]);
  const dismissChild = () => {
    returnFocus.current = child === 'profiles' ? 'profiles' : 'unlock';
    setChild(null);
  };
  const load = (file: File) => {
    stop();
    setHasContent(false);
    setBusy(null);
    setPlan(null);
    setPortableSelection(null);
    setFileName(file.name);
    setPortableItems(null);
    setPortableFormat('json');
    setPortableColumns([]);
    setPortableCounts({ bookmarks: 0, folders: 0 });
    setChild(null);
    setProfiles([]);
    setSelected([]);
    setUnlockFailed(false);
    setUnlockBusy(false);
    setPhase('checking');
    phaseRef.current = 'checking';
    const current = generation.current;
    const receive = (message: NativePreviewMessage) => {
      if (generation.current !== current) return;
      if (message.type === 'event') {
        report(message.event);
        return;
      }
      setUnlockBusy(false);
      setPlan(null);
      setBusy(null);
      setPortableSelection(null);
      if (message.type === 'portable') {
        source.current = { kind: 'portable', items: message.items };
        setHasContent(message.items.every((item) => item.data !== undefined));
        generation.current += 1;
        setPortableItems(
          message.items.map((item) => {
            const preview = { ...item };
            delete preview.data;
            return preview;
          }),
        );
        setPortableFormat(message.format ?? 'json');
        setPortableColumns(message.csvColumns ?? []);
        setPhase('ready');
        phaseRef.current = 'ready';
        client.current?.terminate();
        client.current = null;
      } else if (message.type === 'ready') {
        source.current = message.payload
          ? { kind: 'native', payload: message.payload }
          : null;
        setHasContent(message.payload !== undefined);
        generation.current += 1;
        setProfiles(message.profiles);
        setSelected(message.profiles.map((profile) => profile.id));
        setPhase('ready');
        phaseRef.current = 'ready';
        setChild(null);
        returnFocus.current = 'profiles';
        // Validation is complete; retain the verified payload for the save worker.
        client.current?.terminate();
        client.current = null;
      } else if (message.type === 'locked') {
        setPhase('locked');
        phaseRef.current = 'locked';
        setUnlockFailed(message.failed);
      } else {
        generation.current += 1;
        setPhase('failed');
        phaseRef.current = 'failed';
        setChild(null);
        client.current?.terminate();
        client.current = null;
      }
    };
    try {
      client.current = createClient(receive);
      client.current.load(file);
    } catch {
      receive({
        type: 'event',
        event: { level: 'ERROR', code: 'import.validation.failed' },
      });
      receive({ type: 'failed' });
    }
  };
  const chosen = profiles.filter((profile) => selected.includes(profile.id));
  const cancelSave = () => {
    operation.current?.abort();
    operation.current = null;
    setPlan(null);
    setBusy(null);
    saveFocus.current = 'import';
    report({ level: 'WARN', code: 'import.save.cancelled' });
  };
  const prepareSave = async () => {
    const service = writerRef.current;
    if (!service || !source.current || !destinations || operation.current)
      return;
    const controller = new AbortController();
    operation.current = controller;
    setBusy('preparing');
    report({ level: 'INFO', code: 'import.save.started' });
    try {
      let request: ImportRequest;
      if (source.current.kind === 'native')
        request = {
          ...source.current,
          selected,
          originProfileId: destinations.activeProfileId,
        };
      else {
        if (!portableSelection) throw new Error('import-selection-missing');
        request = {
          kind: 'portable',
          items: includedPortableItems(
            source.current.items,
            new Set(portableSelection.selected),
          ),
          profileId: portableSelection.profileId,
          folderId: portableSelection.folderId,
          originProfileId: destinations.activeProfileId,
        };
      }
      const next = await service.prepare(request, controller.signal);
      if (controller.signal.aborted) return;
      setPlan(next);
      setBusy(null);
      report({ level: 'INFO', code: 'import.save.prepared' });
    } catch {
      if (!controller.signal.aborted) {
        operation.current = null;
        setBusy(null);
        report({ level: 'ERROR', code: 'import.save.failed' });
      }
    }
  };
  const commitSave = async () => {
    const controller = operation.current;
    if (!plan || !controller || busy) return;
    setBusy('saving');
    try {
      const result = await plan.commit(controller.signal);
      // Commit completion defines success, including when page closure races with feedback.
      operation.current = null;
      source.current = null;
      phaseRef.current = 'empty';
      setPlan(null);
      saveFocus.current = 'close';
      setHasContent(false);
      setBusy(null);
      setPhase('empty');
      setFileName('');
      setProfiles([]);
      setSelected([]);
      setPortableItems(null);
      setPortableSelection(null);
      report({ level: 'INFO', code: 'import.save.succeeded' });
      if (plan.excluded)
        report({ level: 'WARN', code: 'import.save.excluded' });
      if (plan.synchronizationPaused)
        report({ level: 'WARN', code: 'import.save.paused' });
      try {
        await onImported?.(result.profileIds);
      } catch {
        report({ level: 'WARN', code: 'import.save.refresh-failed' });
      }
      if (preferences.closeAfterSuccess) onClose();
    } catch (error) {
      if (!controller.signal.aborted) {
        operation.current = null;
        setPlan(null);
        saveFocus.current = 'import';
        setBusy(null);
        report({
          level:
            error instanceof Error &&
            error.message === 'import-destination-changed'
              ? 'WARN'
              : 'ERROR',
          code:
            error instanceof Error &&
            error.message === 'import-destination-changed'
              ? 'import.save.changed'
              : 'import.save.failed',
        });
      }
    }
  };
  const counts = {
    bookmarks: chosen.reduce((sum, profile) => sum + profile.bookmarks, 0),
    folders: chosen.reduce((sum, profile) => sum + profile.folders, 0),
  };
  return (
    <dialog
      ref={dialog}
      className="backup-dialog export-dialog import-dialog"
      aria-labelledby="import-title"
      aria-describedby="import-description"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="backup-dialog__main">
        <header className="backup-dialog__header">
          <div>
            <h1 id="import-title">{t('import.title')}</h1>
            <p id="import-description">{t('import.description')}</p>
          </div>
          <button
            ref={closeButton}
            className="backup-dialog__close"
            type="button"
            aria-label={t('import.close')}
            onClick={onClose}
          >
            <ClearIcon />
          </button>
        </header>
        <div className="export-dialog__body">
          <div className="import-dialog__grid">
            <section
              className="export-dialog__section"
              aria-labelledby="import-file-heading"
            >
              <h2 id="import-file-heading">
                <span aria-hidden="true">1.</span> {t('import.chooseFile')}
              </h2>
              <div className="import-dialog__file-card">
                <span className="import-dialog__icon">
                  <NoteIcon />
                </span>
                <span className="import-dialog__file-identity">
                  {fileName ? (
                    <ImportFilename name={fileName} />
                  ) : (
                    <>
                      <strong>{t('import.supportedFiles')}</strong>
                      <span>{t('import.supportedFilesDescription')}</span>
                    </>
                  )}
                  {phase === 'ready' || phase === 'locked' ? (
                    <span>
                      {t(
                        portableItems !== null && phase === 'ready'
                          ? `import.fileType.${portableFormat}`
                          : phase === 'ready' || phase === 'locked'
                            ? 'import.fileType.native'
                            : 'import.fileType.supported',
                      )}
                    </span>
                  ) : null}
                </span>
                <label className="profile-file import-dialog__file">
                  {t(
                    phase === 'empty'
                      ? 'import.chooseFile'
                      : 'import.changeFile',
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    disabled={busy !== null}
                    accept=".bmpro,.json,.html,.htm,.csv"
                    aria-label={t('import.chooseFile')}
                    aria-describedby="import-file-help"
                    onChange={(event) => {
                      const file = event.currentTarget.files?.[0];
                      event.currentTarget.value = '';
                      if (file) load(file);
                    }}
                  />
                </label>
              </div>
              <p className={'visually-hidden'} id="import-file-help">
                {t('import.nativeOnly')}
              </p>
              <p
                className="visually-hidden"
                role="status"
                aria-label={t('import.validationStatus')}
              >
                {phase === 'checking'
                  ? t('import.checking')
                  : phase === 'locked'
                    ? t('import.locked')
                    : phase === 'ready'
                      ? t('import.verified')
                      : t('import.noFile')}
              </p>
              {phase === 'failed' ? (
                <p role="alert">{t('import.invalid')}</p>
              ) : null}
              {phase === 'locked' ? (
                <button
                  ref={unlockButton}
                  className="import-dialog__unlock-button"
                  type="button"
                  aria-haspopup="dialog"
                  onClick={() => setChild('unlock')}
                >
                  {t('import.unlockFile')}
                </button>
              ) : null}
            </section>
            {portableItems !== null ? (
              destinations ? (
                <PortableImportPanel
                  items={portableItems}
                  destinations={destinations}
                  report={report}
                  format={portableFormat}
                  csvColumns={portableColumns}
                  preferences={preferences}
                  onSummaryChange={setPortableCounts}
                  onSelectionChange={setPortableSelection}
                />
              ) : (
                <p role="alert">{t('import.destinationFailed')}</p>
              )
            ) : (
              <>
                <section
                  className="export-dialog__section import-dialog__profiles"
                  aria-labelledby="import-profiles-heading"
                >
                  <h2 id="import-profiles-heading">
                    <span aria-hidden="true">2.</span>{' '}
                    {t('import.profilesToCreate')}
                  </h2>
                  <button
                    ref={profileButton}
                    className="export-dialog__profile-button"
                    type="button"
                    disabled={phase !== 'ready'}
                    aria-haspopup="dialog"
                    aria-label={t('import.selectProfiles')}
                    onClick={() => setChild('profiles')}
                  >
                    <span className="import-dialog__icon">
                      <ProfileIcon />
                    </span>
                    <span>
                      {t('import.selectedOf', {
                        count: selected.length,
                        total: profiles.length,
                      })}
                    </span>
                    <ChevronIcon />
                  </button>
                </section>
                <section
                  className="export-dialog__section import-dialog__review"
                  aria-labelledby="import-review-heading"
                >
                  <h2 id="import-review-heading">
                    <span aria-hidden="true">3.</span> {t('import.review')}
                  </h2>
                  <div className="import-dialog__summary">
                    <span className="import-dialog__icon">
                      <NoteIcon />
                    </span>
                    <strong>
                      {t('import.newProfiles', { count: selected.length })}
                    </strong>
                    <span aria-hidden="true">·</span>
                    <span>
                      <ImportCounts {...counts} />
                    </span>
                  </div>
                  <div className="import-dialog__notes">
                    <p className="export-dialog__hint">
                      {t('import.existingKept')}
                    </p>
                  </div>
                </section>
              </>
            )}
          </div>
        </div>
        {busy === 'preparing' ? (
          <p className="export-dialog__status" role="status">
            {t('import.preparing')}
          </p>
        ) : null}
        <footer className="backup-dialog__footer">
          <p className="export-dialog__footer-summary">
            {portableItems !== null ? (
              <ImportCounts {...portableCounts} />
            ) : (
              t('import.selected', { count: selected.length })
            )}
          </p>
          <div className="export-dialog__footer-actions">
            <button type="button" onClick={onClose}>
              {t('import.closeAction')}
            </button>
            <button
              ref={importButton}
              type="button"
              className="is-primary"
              disabled={
                !hasContent ||
                phase !== 'ready' ||
                busy !== null ||
                (portableItems !== null
                  ? !portableSelection ||
                    portableCounts.bookmarks + portableCounts.folders === 0
                  : selected.length === 0)
              }
              onClick={() => {
                void prepareSave();
              }}
            >
              {busy === 'preparing'
                ? t('import.preparing')
                : busy === 'saving'
                  ? t('import.saving')
                  : t('import.action')}
            </button>
          </div>
        </footer>
      </div>
      {plan ? (
        <ImportChild title={t('import.confirmSave')} onClose={cancelSave}>
          <div className="import-child__body" aria-busy={busy === 'saving'}>
            <p>
              <ImportCounts bookmarks={plan.bookmarks} folders={plan.folders} />
            </p>
            {plan.profiles ? (
              <p>{t('import.newProfiles', { count: plan.profiles })}</p>
            ) : null}
            {plan.duplicates ? (
              <div className="export-dialog__notice is-warning" role="status">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path d="M12 3 22 21H2L12 3Z" />
                  <path d="M12 9v5m0 3v1" />
                </svg>
                <span className="export-dialog__notice-text">
                  {t(
                    plan.duplicatePolicy === 'prevent'
                      ? 'import.duplicatesExcluded'
                      : plan.duplicatePolicy === 'warn'
                        ? 'import.duplicatesConfirm'
                        : 'import.duplicatesAllowed',
                    { count: plan.duplicates },
                  )}
                </span>
              </div>
            ) : null}
            <p role="status">{t('import.snapshot.' + plan.snapshotMode)}</p>
            <p role="status">
              {busy === 'saving' ? t('import.saving') : t('import.readyToSave')}
            </p>
          </div>
          <ImportFooter>
            <button type="button" onClick={cancelSave}>
              {t('import.closeAction')}
            </button>
            <button
              type="button"
              className="is-primary"
              disabled={
                busy !== null ||
                plan.bookmarks + plan.folders + plan.profiles === 0
              }
              onClick={() => {
                void commitSave();
              }}
            >
              {busy === 'saving' ? t('import.saving') : t('import.action')}
            </button>
          </ImportFooter>
        </ImportChild>
      ) : null}
      {child === 'profiles' ? (
        <ImportedProfiles
          profiles={profiles}
          selected={selected}
          onChange={setSelected}
          onClose={dismissChild}
        />
      ) : null}
      {child === 'unlock' ? (
        <UnlockDialog
          busy={unlockBusy}
          failed={unlockFailed}
          onClose={() => {
            if (unlockBusy) {
              stop();
              setPhase('empty');
              setUnlockBusy(false);
            }
            dismissChild();
          }}
          onUnlock={(password) => {
            setUnlockBusy(true);
            setUnlockFailed(false);
            try {
              client.current?.unlock(password);
            } catch {
              setUnlockBusy(false);
              setUnlockFailed(true);
              report({ level: 'ERROR', code: 'import.unlock.failed' });
            }
          }}
        />
      ) : null}
    </dialog>
  );
}

function ImportedProfiles({
  profiles,
  selected,
  onChange,
  onClose,
}: {
  profiles: NativeProfilePreview[];
  selected: string[];
  onChange: (ids: string[]) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [filter, setFilter] = useState('');
  const visible = profiles.filter((profile) =>
    profile.name
      .toLocaleLowerCase()
      .includes(filter.trim().toLocaleLowerCase()),
  );
  return (
    <ImportChild title={t('import.selectProfiles')} onClose={onClose}>
      <div className="import-child__body">
        <ImportFilter
          label={t('import.filterImportedProfiles')}
          value={filter}
          onChange={setFilter}
        />
        {visible.length > 1 ? (
          <div
            className="import-profile-actions"
            role="group"
            aria-label={t('import.bulkProfiles')}
          >
            <span id="import-profile-bulk-help" className="visually-hidden">
              {t('import.bulkProfilesHelp')}
            </span>
            <button
              type="button"
              aria-describedby="import-profile-bulk-help"
              disabled={visible.every((profile) =>
                selected.includes(profile.id),
              )}
              onClick={() =>
                onChange([
                  ...new Set([
                    ...selected,
                    ...visible.map((profile) => profile.id),
                  ]),
                ])
              }
            >
              {t('import.checkAll')}
            </button>
            <button
              type="button"
              aria-describedby="import-profile-bulk-help"
              disabled={visible.every(
                (profile) => !selected.includes(profile.id),
              )}
              onClick={() => {
                const matching = new Set(visible.map((profile) => profile.id));
                onChange(selected.filter((id) => !matching.has(id)));
              }}
            >
              {t('import.uncheckAll')}
            </button>
          </div>
        ) : null}
        <div className="export-profile-picker__list">
          <fieldset className="import-profile-group">
            <legend className="visually-hidden">
              {t('import.selectProfiles')}
            </legend>
            {visible.map((profile) => (
              <label
                key={profile.id}
                className="settings-checkbox-row export-profile-picker__row"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(profile.id)}
                  onChange={(event) =>
                    onChange(
                      event.target.checked
                        ? [...selected, profile.id]
                        : selected.filter((id) => id !== profile.id),
                    )
                  }
                />
                <span className="import-profile-avatar">
                  <ProfileIcon />
                </span>
                <span className="export-profile-picker__identity">
                  <strong>{profile.name}</strong>
                  <span className="export-profile-picker__meta">
                    <ImportCounts
                      bookmarks={profile.bookmarks}
                      folders={profile.folders}
                    />
                  </span>
                </span>
              </label>
            ))}
            {!visible.length ? (
              <p className="folder-tree__empty" role="status">
                {t('import.noMatches')}
              </p>
            ) : null}
          </fieldset>
        </div>
      </div>
      <ImportFooter>
        <p
          className="export-profile-picker__count"
          role="status"
          aria-label={t('import.selectionStatus')}
        >
          {t('import.selectedOf', {
            count: selected.length,
            total: profiles.length,
          })}
        </p>
        <button type="button" onClick={onClose}>
          {t('import.done')}
        </button>
      </ImportFooter>
    </ImportChild>
  );
}

function UnlockDialog({
  busy,
  failed,
  onUnlock,
  onClose,
}: {
  busy: boolean;
  failed: boolean;
  onUnlock: (password: string) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const [shown, setShown] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (failed) input.current?.focus();
  }, [failed]);
  return (
    <ImportChild title={t('import.unlockFile')} onClose={onClose}>
      <form
        className="import-unlock"
        onSubmit={(event) => {
          event.preventDefault();
          if (busy || !password) return;
          onUnlock(password);
          setPassword('');
          setShown(false);
        }}
      >
        <div className="import-child__body">
          <label className="export-dialog__field" htmlFor="import-password">
            <span>{t('import.password')}</span>
            <span
              className="clearable-input export-password-input"
              data-has-value={Boolean(password)}
            >
              <ClearableInput
                ref={input}
                id="import-password"
                type={shown ? 'text' : 'password'}
                value={password}

                autoComplete="off"
                spellCheck={false}
                disabled={busy}
                aria-invalid={failed || undefined}
                clearLabel={t('export.clearPassword')}
                onChange={(event) => setPassword(event.target.value)}
              />
              <button
                className="clearable-input__button export-password-input__visibility"
                type="button"
                disabled={busy}
                aria-label={t(
                  shown ? 'export.hidePassword' : 'export.showPasswordInput',
                )}
                aria-pressed={shown}
                onClick={() => setShown((value) => !value)}
              >
                <PasswordVisibilityIcon revealed={shown} />
              </button>
            </span>
          </label>
        </div>
        <footer className="backup-dialog__footer import-unlock__footer">
          <p className="import-unlock__status" role="status">
            {busy ? t('import.unlocking') : '\u00a0'}
          </p>
          <button type="button" onClick={onClose}>
            {t('import.cancel')}
          </button>
          <button
            type="submit"
            className="is-primary"
            disabled={busy || !password}
          >
            {t('import.unlock')}
          </button>
        </footer>
      </form>
    </ImportChild>
  );
}
