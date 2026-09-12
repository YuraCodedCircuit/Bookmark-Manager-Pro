import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';

import { ClearIcon } from '../../components/icons/ClearIcon';
import { InformationIcon } from '../../components/icons/InformationIcon';
import { PermissionIcon } from '../../components/icons/PermissionIcon';
import { SyncDirectionIcon } from '../../components/icons/SyncDirectionIcon';
import { SyncFolderDialog } from './SyncFolderDialog';
import type {
  SyncChoices,
  SyncConnection,
  SyncConflict,
} from '../../domain/synchronization';
import type { SyncRequest } from '../../messaging/sync-protocol';
import {
  previewInitialSync,
  syncSelectedPath,
  validateSyncTree,
  type SyncDirection,
  type SyncNode,
  type SyncPreview,
} from '../../domain/sync-preview';
import type { SyncBookmarksAdapter } from '../../platform/browser/sync-bookmarks';
import type { SyncSetupEvent } from './sync-setup-feedback';

interface Props {
  profileId?: string;
  adapter: SyncBookmarksAdapter;
  extensionFolders: readonly SyncNode[];
  readExtension(): Promise<SyncNode[]>;
  onClose(): void;
  beforeMutation?(): Promise<void>;
  onReport(event: SyncSetupEvent): void | Promise<void>;
  returnFocusRef?: RefObject<HTMLButtonElement | null>;
}

/** Manages the active profile's durable connection and explicit reconciliation choices. */
export function SynchronizationDialog({
  profileId,
  adapter,
  extensionFolders,
  readExtension,
  onClose,
  beforeMutation = async () => undefined,
  onReport,
  returnFocusRef,
}: Props) {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const directionInformationRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const directionRadioRefs = useRef<Array<HTMLInputElement | null>>([]);
  const requestId = useRef({ value: 0 });
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [extensionId, setExtensionId] = useState('');
  const [browserId, setBrowserId] = useState('');
  const [browserNodes, setBrowserNodes] = useState<SyncNode[]>([]);
  const [direction, setDirection] = useState<SyncDirection>('both');
  const [directionHelpOpen, setDirectionHelpOpen] =
    useState<SyncDirection | null>(null);
  const [preview, setPreview] = useState<SyncPreview | null>(null);
  const [notice, setNotice] = useState<SyncSetupEvent | null>(null);
  const [permission, setPermission] = useState(false);
  const [picker, setPicker] = useState<'extension' | 'browser' | null>(null);
  const [connection, setConnection] = useState<SyncConnection | null>(null);
  const [token, setToken] = useState<string>();
  const [conflicts, setConflicts] = useState<SyncConflict[]>([]);
  const [choices, setChoices] = useState<SyncChoices>({});
  const [serviceError, setServiceError] = useState('');
  const extensionLabel = useMemo(
    () => syncSelectedPath(validateSyncTree(extensionFolders), extensionId),
    [extensionFolders, extensionId],
  );
  const browserLabel = useMemo(
    () => syncSelectedPath(browserNodes, browserId),
    [browserNodes, browserId],
  );
  const isManagedConnection = !!connection && connection.status !== 'conflict';

  const report = (event: SyncSetupEvent) => {
    try {
      void Promise.resolve(onReport(event)).catch(() =>
        console.error('sync-setup-feedback-failed'),
      );
    } catch {
      console.error('sync-setup-feedback-failed');
    }
  };

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement;
    const returnFocus = returnFocusRef?.current;
    const requests = requestId.current;
    let active = true;
    if (dialog && !dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    }
    closeRef.current?.focus();
    void adapter
      .ready()
      .then(async () => {
        const granted = (await adapter.hasPermission?.()) ?? false;
        const nodes = granted ? await adapter.readTree() : [];
        const state =
          profileId && adapter.command
            ? await adapter.command({
                type: 'sync.command',
                protocolVersion: 1,
                profileId,
                command: 'status',
              })
            : null;
        if (active) {
          setReady(true);
          setPermission(granted);
          setBrowserNodes(nodes);
          if (state?.connection) {
            setConnection(state.connection);
            setExtensionId(state.connection.extensionRoot);
            setBrowserId(state.connection.browserRoot);
            setDirection(state.connection.direction);
          }
        }
      })
      .catch(() => {
        if (active) {
          setReady(true);
          setNotice('unavailable');
        }
        console.error('sync-setup-adapter-unavailable');
      });
    return () => {
      active = false;
      requests.value++;
      if (dialog?.open) {
        if (typeof dialog.close === 'function') dialog.close();
        else dialog.removeAttribute('open');
      }
      if (returnFocus?.isConnected) returnFocus.focus();
      else if (
        previousFocus instanceof HTMLElement &&
        previousFocus.isConnected &&
        (!previousFocus.closest('dialog') ||
          previousFocus.closest('dialog')?.open)
      )
        previousFocus.focus();
    };
  }, [adapter, returnFocusRef, profileId]);

  useEffect(() => {
    if (!profileId || !adapter.command || busy || !ready) return;
    let active = true,
      pending = false;
    const refresh = async () => {
      if (pending) return;
      pending = true;
      try {
        const [state, granted] = await Promise.all([
          adapter.command!({
            type: 'sync.command',
            protocolVersion: 1,
            profileId,
            command: 'status',
          }),
          adapter.hasPermission?.(),
        ]);
        if (active) {
          setConnection(state.connection);
          if (granted !== undefined) setPermission(granted);
        }
      } catch {
        if (active) setServiceError('failed');
      } finally {
        pending = false;
      }
    };
    const interval = window.setInterval(() => void refresh(), 3000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [adapter, profileId, busy, ready]);

  const openBrowserPicker = async () => {
    const request = ++requestId.current.value;
    setBusy(true);
    try {
      const nodes = await adapter.readTree();
      if (request !== requestId.current.value) return;
      setBrowserNodes(nodes);
      setPicker('browser');
    } catch {
      if (request !== requestId.current.value) return;
      setNotice('loadFailed');
      report('loadFailed');
      setPermission(
        (await adapter.hasPermission?.().catch(() => false)) ?? false,
      );
    } finally {
      if (request === requestId.current.value) setBusy(false);
    }
  };

  const chooseBrowserFolder = async (recoverConnection = false) => {
    const request = ++requestId.current.value;
    setBusy(true);
    setPreview(null);
    setNotice(null);
    try {
      // Call before any await to preserve the native permission gesture.
      const granted = await adapter.requestAccess();
      if (request !== requestId.current.value) return;
      if (!granted) {
        setBrowserNodes([]);
        setBrowserId('');
        setNotice('accessDenied');
        report('accessDenied');
        return;
      }
      if (!recoverConnection) report('accessGranted');
      setPermission(true);
      const nodes = await adapter.readTree();
      if (request !== requestId.current.value) return;
      setBrowserNodes(nodes);
      if (recoverConnection && profileId && adapter.command) {
        const result = await adapter.command({
          type: 'sync.command',
          protocolVersion: 1,
          profileId,
          command: 'retry',
        });
        if (request !== requestId.current.value) return;
        setConnection(result.connection);
        setServiceError(result.error ?? '');
      } else setBrowserId('');
      report('foldersLoaded');
    } catch (error) {
      if (request !== requestId.current.value) return;
      const event =
        error instanceof Error && error.message === 'sync-api-unavailable'
          ? 'unavailable'
          : 'loadFailed';
      setBrowserNodes([]);
      setBrowserId('');
      setNotice(event);
      report(event);
    } finally {
      if (request === requestId.current.value) setBusy(false);
    }
  };

  const refreshPreview = async () => {
    const request = ++requestId.current.value;
    setBusy(true);
    setPreview(null);
    setNotice(null);
    try {
      if (profileId && adapter.command) {
        const result = await adapter.command({
          type: 'sync.command',
          protocolVersion: 1,
          profileId,
          command: 'preview',
          setup: {
            extensionRoot: extensionId,
            browserRoot: browserId,
            direction,
            choices,
          },
        });
        if (request !== requestId.current.value) return;
        setServiceError(result.error ?? '');
        setToken(result.token);
        setPreview(result.preview ?? null);
        setConflicts(result.conflicts ?? []);
        if (result.error) report('previewFailed');
        else
          report(
            result.preview?.conflicts || result.preview?.skipped
              ? 'previewIncomplete'
              : 'previewComplete',
          );
        return;
      }
      const [extension, browser] = await Promise.all([
        readExtension(),
        adapter.readTree(),
      ]);
      const result = previewInitialSync(
        extension,
        browser,
        extensionId,
        browserId,
        direction,
      );
      if (request !== requestId.current.value) return;
      setPreview(result);
      const event =
        result.conflicts || result.skipped
          ? 'previewIncomplete'
          : 'previewComplete';
      setNotice(event);
      report(event);
    } catch {
      if (request !== requestId.current.value) return;
      setNotice('previewFailed');
      report('previewFailed');
    } finally {
      if (request === requestId.current.value) setBusy(false);
    }
  };

  const invalidate = () => {
    setPreview(null);
    setToken(undefined);
    setNotice(null);
  };
  const error = notice === 'loadFailed' || notice === 'previewFailed';
  const noticeTakesPriority =
    error || notice === 'accessDenied' || notice === 'unavailable';
  const execute = async (command: SyncRequest['command']) => {
    if (!profileId || !adapter.command) return;
    const request = ++requestId.current.value;
    setBusy(true);
    setServiceError('');
    try {
      if (['enable', 'resume', 'retry'].includes(command))
        await beforeMutation();
      const result = await adapter.command({
        type: 'sync.command',
        protocolVersion: 1,
        profileId,
        command,
        ...(token ? { token } : {}),
      });
      if (request !== requestId.current.value) return;
      setConnection(result.connection);
      setServiceError(result.error ?? '');
      setToken(undefined);
      setPreview(null);
    } catch {
      if (request !== requestId.current.value) return;
      setServiceError('failed');
      report('operationFailed');
    } finally {
      if (request === requestId.current.value) setBusy(false);
    }
  };
  return (
    <dialog
      className="sync-dialog"
      aria-labelledby="sync-title"
      aria-describedby="sync-description"
      ref={dialogRef}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <header className="sync-dialog__header">
        <div>
          <h1 id="sync-title">{t('sync.title')}</h1>
          <p id="sync-description">{t('sync.description')}</p>
        </div>
        <button
          type="button"
          ref={closeRef}
          aria-label={t('sync.close')}
          onClick={onClose}
        >
          <ClearIcon />
        </button>
      </header>
      <div className="sync-dialog__body" aria-busy={busy}>
        {isManagedConnection ? (
          <>
            <section
              className={`sync-dialog__connection-status is-${connection.status}`}
              aria-labelledby="sync-connection-status-title"
            >
              <i className="sync-dialog__connection-icon" aria-hidden="true" />
              <div>
                <h2 id="sync-connection-status-title">
                  {t(`sync.management.${connection.status}.title`)}
                </h2>
                <p>{t(`sync.management.${connection.status}.description`)}</p>
              </div>
            </section>
            <section
              className="sync-dialog__connection-summary"
              aria-labelledby="sync-connection-summary-title"
            >
              <h2 id="sync-connection-summary-title">
                {t('sync.management.summary')}
              </h2>
              <dl>
                <div>
                  <dt>{t('sync.extensionFolder')}</dt>
                  <dd title={extensionLabel || undefined}>
                    {extensionLabel || t('sync.management.folderUnavailable')}
                  </dd>
                </div>
                <div>
                  <dt>{t('sync.browserFolder')}</dt>
                  <dd title={browserLabel || undefined}>
                    {browserLabel || t('sync.management.folderUnavailable')}
                  </dd>
                </div>
                <div>
                  <dt>{t('sync.management.direction')}</dt>
                  <dd>{t(`sync.directions.${connection.direction}`)}</dd>
                </div>
                <div>
                  <dt>{t('sync.management.lastSynchronized')}</dt>
                  <dd>
                    {connection.lastSuccess
                      ? new Date(connection.lastSuccess).toLocaleString()
                      : t('sync.management.notYetSynchronized')}
                  </dd>
                </div>
              </dl>
            </section>
            <section
              className="sync-dialog__management"
              aria-labelledby="sync-management-title"
            >
              <h2 id="sync-management-title">{t('sync.management.actions')}</h2>
              <div className="sync-dialog__management-actions">
                {connection.status !== 'missing-root' ? (
                  <div className="sync-dialog__management-action">
                    <div>
                      <h3>
                        {t(
                          connection.status === 'connected'
                            ? 'sync.pause'
                            : connection.status === 'permission'
                              ? 'sync.grantPermission'
                              : connection.status === 'error'
                                ? 'sync.retry'
                                : 'sync.resume',
                        )}
                      </h3>
                      <p id="sync-management-toggle-help">
                        {t(
                          connection.status === 'connected'
                            ? 'sync.management.pauseHelp'
                            : connection.status === 'permission'
                              ? 'sync.management.permissionHelp'
                              : connection.status === 'error'
                                ? 'sync.management.retryHelp'
                                : 'sync.management.resumeHelp',
                        )}
                      </p>
                    </div>
                    <button
                      aria-describedby="sync-management-toggle-help"
                      className={
                        connection.status === 'permission'
                          ? 'sync-dialog__permission'
                          : 'sync-dialog__management-primary'
                      }
                      disabled={busy}
                      type="button"
                      onClick={() =>
                        connection.status === 'permission'
                          ? void chooseBrowserFolder(true)
                          : void execute(
                              connection.status === 'connected'
                                ? 'pause'
                                : 'retry',
                            )
                      }
                    >
                      {connection.status === 'permission' ? (
                        <PermissionIcon />
                      ) : null}
                      {t(
                        connection.status === 'connected'
                          ? 'sync.pause'
                          : connection.status === 'permission'
                            ? 'sync.grantPermission'
                            : connection.status === 'error'
                              ? 'sync.retry'
                              : 'sync.resume',
                      )}
                    </button>
                  </div>
                ) : null}
                <div className="sync-dialog__management-action">
                  <div>
                    <h3>{t('sync.disconnect')}</h3>
                    <p id="sync-management-disconnect-help">
                      {t('sync.management.disconnectHelp')}
                    </p>
                  </div>
                  <button
                    aria-describedby="sync-management-disconnect-help"
                    className="sync-dialog__management-disconnect"
                    disabled={busy}
                    type="button"
                    onClick={() => void execute('disconnect')}
                  >
                    {t('sync.disconnect')}
                  </button>
                </div>
              </div>
            </section>
          </>
        ) : (
          <>
            <div className="sync-dialog__status">
              <span>
                <i
                  className={`sync-dialog__dot${connection?.status === 'connected' ? ' is-connected' : ''}`}
                  aria-hidden="true"
                />
                {connection
                  ? t(`sync.status.${connection.status}`)
                  : t('sync.notConnected')}
              </span>
              <span>{t('sync.activeProfile')}</span>
            </div>
            {connection?.lastSuccess ? (
              <p>
                {t('sync.lastSuccess', {
                  time: new Date(connection.lastSuccess).toLocaleString(),
                })}
              </p>
            ) : null}
            <fieldset disabled={busy}>
              <legend>{t('sync.folders')}</legend>
              <div className="sync-dialog__folders">
                <div className="sync-dialog__folder">
                  <label htmlFor="sync-extension">
                    <span className="sync-dialog__step" aria-hidden="true">
                      1.
                    </span>{' '}
                    {t('sync.extensionFolder')}
                  </label>
                  <button
                    type="button"
                    id="sync-extension"
                    disabled={!!connection}
                    onClick={() => setPicker('extension')}
                    title={extensionLabel || undefined}
                  >
                    {extensionLabel || t('sync.chooseFolder')}
                  </button>
                </div>
                <div className="sync-dialog__flow">
                  <SyncDirectionIcon direction={direction} />
                </div>
                <div className="sync-dialog__folder">
                  <span>
                    <span className="sync-dialog__step" aria-hidden="true">
                      2.
                    </span>{' '}
                    {t('sync.browserFolder')}
                  </span>
                  <button
                    type="button"
                    className={
                      !permission ? 'sync-dialog__permission' : undefined
                    }
                    disabled={!ready || (!!connection && permission)}
                    title={browserLabel || undefined}
                    onClick={() =>
                      permission
                        ? void openBrowserPicker()
                        : void chooseBrowserFolder()
                    }
                  >
                    {!permission ? <PermissionIcon /> : null}
                    {permission
                      ? browserLabel || t('sync.chooseBrowser')
                      : t('sync.grantPermission')}
                  </button>
                </div>
              </div>
            </fieldset>
            <fieldset disabled={busy || !!connection}>
              <legend>
                <span className="sync-dialog__step" aria-hidden="true">
                  3.
                </span>{' '}
                {t('sync.direction')}
              </legend>
              <div className="sync-dialog__directions">
                {(
                  [
                    'browser-to-extension',
                    'extension-to-browser',
                    'both',
                  ] as const
                ).map((value, index) => (
                  <div
                    key={value}
                    className={`sync-dialog__direction${direction === value ? ' is-selected' : ''}`}
                  >
                    <button
                      type="button"
                      ref={(element) => {
                        directionInformationRefs.current[index] = element;
                      }}
                      className="sync-dialog__direction-info"
                      aria-controls="sync-direction-description"
                      aria-expanded={directionHelpOpen === value}
                      aria-label={t('sync.directionInformation', {
                        direction: t(`sync.directions.${value}`),
                      })}
                      onKeyDown={(event) => {
                        if (event.key !== 'Tab') return;
                        const radio = event.shiftKey
                          ? directionRadioRefs.current[index - 1]
                          : directionRadioRefs.current[index];
                        if (!radio) return;
                        event.preventDefault();
                        radio.focus();
                      }}
                      onClick={() =>
                        setDirectionHelpOpen((open) =>
                          open === value ? null : value,
                        )
                      }
                    >
                      <InformationIcon />
                    </button>
                    <label>
                      <input
                        type="radio"
                        name="sync-direction"
                        value={value}
                        ref={(element) => {
                          directionRadioRefs.current[index] = element;
                        }}
                        onKeyDown={(event) => {
                          if (event.key !== 'Tab') return;
                          const information = event.shiftKey
                            ? directionInformationRefs.current[index]
                            : directionInformationRefs.current[index + 1];
                          if (!information) return;
                          event.preventDefault();
                          information.focus();
                        }}
                        checked={direction === value}
                        onChange={() => {
                          setDirection(value);
                          setDirectionHelpOpen(null);
                          invalidate();
                        }}
                      />
                      <SyncDirectionIcon direction={value} />
                      {t(`sync.directions.${value}`)}
                    </label>
                  </div>
                ))}
              </div>
              {directionHelpOpen ? (
                <p id="sync-direction-description">
                  {t(`sync.directionHelp.${directionHelpOpen}`)}
                </p>
              ) : null}
            </fieldset>
            <div className="sync-dialog__snapshot">
              <label>
                <input type="checkbox" disabled checked={false} />
                {t('sync.snapshotUnavailable')}
              </label>
            </div>
            <section
              className="sync-dialog__preview"
              aria-labelledby="sync-preview-title"
            >
              <div className="sync-dialog__preview-heading">
                <h2 id="sync-preview-title">
                  <span className="sync-dialog__step" aria-hidden="true">
                    4.
                  </span>{' '}
                  {t('sync.preview')}
                </h2>
                <button
                  type="button"
                  disabled={busy || !extensionId || !browserId}
                  onClick={() => void refreshPreview()}
                >
                  {t('sync.refresh')}
                </button>
              </div>
              {preview ? (
                <>
                  <table>
                    <caption className="visually-hidden">
                      {t('sync.preview')}
                    </caption>
                    <thead>
                      <tr>
                        <th scope="col">{t('sync.destination')}</th>
                        <th scope="col">{t('sync.add')}</th>
                        <th scope="col">{t('sync.update')}</th>
                        <th scope="col">{t('sync.delete')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(['extension', 'browser'] as const).map((side) => (
                        <tr key={side}>
                          <th scope="row">{t(`sync.${side}Folder`)}</th>
                          <td>{preview[side].add}</td>
                          <td>{preview[side].update}</td>
                          <td>{preview[side].delete}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p>
                    {t('sync.counts', {
                      conflicts: preview.conflicts,
                      skipped: preview.skipped,
                    })}
                  </p>
                </>
              ) : (
                <p>
                  {t(
                    busy
                      ? 'sync.loading'
                      : extensionId && browserId
                        ? 'sync.readyToPreview'
                        : 'sync.emptyPreview',
                  )}
                </p>
              )}
              {preview?.conflicts ? <p>{t('sync.previewHelp')}</p> : null}
            </section>
          </>
        )}
        {conflicts.map((conflict) => (
          <section key={conflict.id} className="sync-dialog__preview">
            <h2>
              {t(
                conflict.kind === 'pair'
                  ? 'sync.pairCandidates'
                  : 'sync.resolveConflict',
              )}
            </h2>
            {conflict.kind === 'pair' ? (
              conflict.extension.map((node) => (
                <label key={node.id}>
                  {node.title}
                  <select
                    value={choices[`pair:${node.id}`] ?? ''}
                    onChange={(event) => {
                      setChoices((old) => ({
                        ...old,
                        [`pair:${node.id}`]: event.target.value,
                      }));
                      invalidate();
                    }}
                  >
                    <option value="">{t('sync.choosePair')}</option>
                    {conflict.browser.map((candidate) => (
                      <option
                        key={candidate.id}
                        value={candidate.id}
                        disabled={Object.entries(choices).some(
                          ([key, value]) =>
                            key !== `pair:${node.id}` && value === candidate.id,
                        )}
                      >
                        {candidate.title} ({candidate.index + 1})
                      </option>
                    ))}
                  </select>
                </label>
              ))
            ) : (
              <>
                <p>
                  {conflict.extension[0]?.title ?? conflict.browser[0]?.title}
                </p>
                {(['extension', 'browser'] as const).map((side) => (
                  <label key={side}>
                    <input
                      type="radio"
                      name={conflict.id}
                      checked={choices[conflict.id] === side}
                      onChange={() => {
                        setChoices((old) => ({ ...old, [conflict.id]: side }));
                        invalidate();
                      }}
                    />
                    {t(
                      conflict.kind === 'delete'
                        ? conflict[side].length
                          ? 'sync.keepItem'
                          : 'sync.deleteItem'
                        : `sync.use.${side}`,
                    )}
                  </label>
                ))}
              </>
            )}
          </section>
        ))}
        {serviceError && !noticeTakesPriority ? (
          <p role="alert">{t(`sync.errors.${serviceError}`)}</p>
        ) : null}
        {notice && (!serviceError || noticeTakesPriority) ? (
          <p
            role={error ? 'alert' : 'status'}
            className={error ? 'sync-dialog__error' : 'sync-dialog__notice'}
          >
            {t(`sync.events.${notice}`)}
          </p>
        ) : null}
      </div>
      <footer className="sync-dialog__footer">
        {!isManagedConnection ? <p>{t('sync.disconnectHelp')}</p> : null}
        <button type="button" onClick={onClose}>
          {t('sync.cancel')}
        </button>
        {connection && !isManagedConnection ? (
          <button
            className="sync-dialog__management-disconnect"
            disabled={busy}
            type="button"
            onClick={() => void execute('disconnect')}
          >
            {t('sync.disconnect')}
          </button>
        ) : null}
        {!isManagedConnection ? (
          <button
            className="sync-dialog__primary"
            type="button"
            disabled={busy || !token || !!preview?.conflicts}
            onClick={() => void execute('enable')}
          >
            {t(connection ? 'sync.applyPreview' : 'sync.enable')}
          </button>
        ) : null}
      </footer>
      {picker ? (
        <SyncFolderDialog
          side={picker}
          nodes={picker === 'extension' ? extensionFolders : browserNodes}
          selectedId={picker === 'extension' ? extensionId : browserId}
          onClose={() => setPicker(null)}
          onSelect={(id) => {
            if (picker === 'extension') setExtensionId(id);
            else setBrowserId(id);
            setChoices({});
            setConflicts([]);
            invalidate();
            setPicker(null);
          }}
        />
      ) : null}
    </dialog>
  );
}
