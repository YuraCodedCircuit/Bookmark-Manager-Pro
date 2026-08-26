import { createStore, type StoreApi } from 'zustand/vanilla';

export interface ConfirmationRequest {
  cancelLabel: string;
  confirmLabel: string;
  message: string;
  title: string;
  variant?: 'primary' | 'danger';
}

export interface AppConfirmation extends ConfirmationRequest {
  id: string;
}

interface ConfirmationState {
  active: AppConfirmation | undefined;
}

interface PendingConfirmation {
  confirmation: AppConfirmation;
  resolve: (confirmed: boolean) => void;
}

/**
 * Serializes confirmation decisions for one application surface. Requests are
 * transient and never persisted; resolving one request advances the queue.
 */
export class ConfirmationService {
  readonly store: StoreApi<ConfirmationState> = createStore(() => ({
    active: undefined,
  }));
  private active: PendingConfirmation | undefined;
  private readonly queue: PendingConfirmation[] = [];

  request(input: ConfirmationRequest): Promise<boolean> {
    return new Promise((resolve) => {
      const pending: PendingConfirmation = {
        confirmation: { ...input, id: crypto.randomUUID() },
        resolve,
      };
      if (this.active) this.queue.push(pending);
      else this.activate(pending);
    });
  }

  resolve(id: string, confirmed: boolean): void {
    if (!this.active || this.active.confirmation.id !== id) return;
    const completed = this.active;
    this.active = undefined;
    this.store.setState({ active: undefined });
    completed.resolve(confirmed);
    const next = this.queue.shift();
    if (next) this.activate(next);
  }

  private activate(pending: PendingConfirmation): void {
    this.active = pending;
    this.store.setState({ active: pending.confirmation });
  }
}
