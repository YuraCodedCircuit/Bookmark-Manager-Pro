import type { InitializationState } from '../initialization/initialization-state';

/** Extension capabilities that the webpage preview cannot provide. */
export type PreflightCapabilityId =
  | 'extension-startup'
  | 'runtime-messaging'
  | 'extension-permissions'
  | 'native-bookmarks';

/** A capability result retained in the snapshot instead of failing local startup. */
export interface PreflightCapability {
  id: PreflightCapabilityId;
  status: 'unavailable';
  reason: 'web-preview';
}

/**
 * Immutable input used for one complete UI render after local preflight finishes.
 * The operation ID connects that render to its later UI-ready acknowledgement.
 */
export interface WebPreflightSnapshot {
  operationId: string;
  language: string;
  capabilities: readonly PreflightCapability[];
  initialization: InitializationState;
}
