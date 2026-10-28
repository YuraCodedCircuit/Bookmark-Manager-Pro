import {
  decodeNativeExport,
  inspectNativeExport,
  type ExportPayload,
} from '../../domain/profile-export';
import type { ActivityReason } from '../../domain/activity-log';

/** Fixed operation metadata; imported values and exception details never enter events. */
export interface ImportValidationEvent {
  readonly reason?: ActivityReason | undefined;
  readonly operationId?: string | undefined;
  readonly itemsAffected?: number | undefined;
  readonly level: 'INFO' | 'WARN' | 'ERROR';
  readonly code:
    | 'import.validation.started'
    | 'import.validation.unlock-required'
    | 'import.validation.ready'
    | 'import.validation.failed'
    | 'import.validation.cancelled'
    | 'import.unlock.started'
    | 'import.unlock.failed'
    | 'import.destination.failed'
    | 'import.destination.missing'
    | 'import.validation.csv-flat'
    | 'import.save.started'
    | 'import.save.prepared'
    | 'import.save.succeeded'
    | 'import.save.failed'
    | 'import.save.cancelled'
    | 'import.save.changed'
    | 'import.save.excluded'
    | 'import.save.activity-excluded'
    | 'import.save.paused'
    | 'import.save.refresh-failed';
}

/** Preserves the original error for controlled diagnosis, never for direct logging. */
export class ImportValidationError extends Error {
  constructor(
    readonly code: 'import-file-invalid' | 'import-unlock-failed',
    cause: unknown,
  ) {
    super(code, { cause });
    this.name = 'ImportValidationError';
  }
}

/** Only ready states expose payloads; locked states expose no imported content. */
export type NativeImportState =
  | { readonly phase: 'empty' | 'checking' | 'closed' }
  | { readonly phase: 'locked'; readonly unlockFailed: boolean }
  | { readonly phase: 'ready'; readonly payload: ExportPayload }
  | { readonly phase: 'failed'; readonly code: 'import-file-invalid' };

/**
 * Owns a single in-memory native import preview, not a persistence operation.
 * Superseding, cancelling, or closing discards pending results. Web Crypto
 * promises cannot be stopped here: a UI-owned worker is still required to
 * terminate computation on close. No password is retained in instance state.
 */
export class NativeImportSession {
  private current: NativeImportState = { phase: 'empty' };
  private source: string | undefined;
  private failure: ImportValidationError | undefined;
  private generation = 0;

  constructor(
    private readonly record?: (
      event: ImportValidationEvent,
    ) => void | Promise<void>,
  ) {}

  /** Returns current preview state; payloads remain untrusted again if callers mutate them. */
  get state(): NativeImportState {
    return this.current;
  }

  /** Returns the preserved failure for controlled diagnosis, never UI rendering or logging. */
  get diagnosticFailure(): ImportValidationError | undefined {
    return this.failure;
  }

  /** Inspects a file and verifies plaintext payloads before making them available. */
  async load(content: string): Promise<NativeImportState> {
    if (this.current.phase === 'closed')
      throw new Error('import-session-closed');
    this.cancel();
    const generation = this.generation;
    this.current = { phase: 'checking' };
    this.report('INFO', 'import.validation.started');
    try {
      const envelope = inspectNativeExport(content);
      if (envelope.encrypted) {
        this.source = content;
        this.current = { phase: 'locked', unlockFailed: false };
        this.report('INFO', 'import.validation.unlock-required');
      } else {
        const payload = await decodeNativeExport(content);
        if (generation !== this.generation) return this.current;
        this.current = { phase: 'ready', payload };
        this.report('INFO', 'import.validation.ready');
      }
    } catch (cause) {
      if (generation !== this.generation) return this.current;
      this.source = undefined;
      this.failure = new ImportValidationError('import-file-invalid', cause);
      this.current = {
        phase: 'failed',
        code: 'import-file-invalid',
      };
      this.report('ERROR', 'import.validation.failed');
    }
    return this.current;
  }

  /** Verifies encrypted content; failure keeps only ciphertext available for another attempt. */
  async unlock(password: string): Promise<NativeImportState> {
    if (this.current.phase !== 'locked' || this.source === undefined)
      throw new Error('import-file-not-locked');
    const generation = this.generation;
    this.failure = undefined;
    this.current = { phase: 'checking' };
    this.report('INFO', 'import.unlock.started');
    try {
      const payload = await decodeNativeExport(this.source, password);
      if (generation !== this.generation) return this.current;
      this.source = undefined;
      this.current = { phase: 'ready', payload };
      this.report('INFO', 'import.validation.ready');
    } catch (cause) {
      if (generation !== this.generation) return this.current;
      this.failure = new ImportValidationError('import-unlock-failed', cause);
      // Wrong passwords and damaged ciphertext deliberately share one UI state.
      this.current = { phase: 'locked', unlockFailed: true };
      this.report('ERROR', 'import.unlock.failed');
    }
    return this.current;
  }

  /** Drops owned source/preview references and invalidates pending completions. */
  cancel(): void {
    if (this.current.phase === 'closed') return;
    const wasPending = this.current.phase !== 'empty';
    this.generation += 1;
    this.source = undefined;
    this.failure = undefined;
    this.current = { phase: 'empty' };
    if (wasPending) this.report('WARN', 'import.validation.cancelled');
  }

  /** Permanently closes this session; reopening requires a new instance and file selection. */
  close(): void {
    this.cancel();
    this.current = { phase: 'closed' };
  }

  private report(
    level: ImportValidationEvent['level'],
    code: ImportValidationEvent['code'],
  ): void {
    if (!this.record) return;
    const diagnostic = () =>
      console.error('import.validation.log-write-failed', { code });
    try {
      void Promise.resolve(this.record({ level, code })).catch(diagnostic);
    } catch {
      diagnostic();
    }
  }
}
