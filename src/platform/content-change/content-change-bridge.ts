import { z } from 'zod';

import {
  CONTENT_CHANGE_PROTOCOL_VERSION,
  PROFILE_ACTIVATION_PROTOCOL_VERSION,
  contentChangeSchema,
  profileActivationSchema,
  type ContentChange,
  type ContentChangeInput,
  type ProfileActivation,
  type ProfileActivationInput,
} from '../../messaging/content-change-protocol';
import { BookmarkManagerDatabase } from '../../storage/database';

const CHANNEL = 'bookmark-manager-pro.content-change.v1';
const revisionSchema = z.number().int().nonnegative();
const activeProfileSchema = z.uuid();

/** Publishes validated change hints and persists a monotonic per-profile revision. */
export class ContentChangeBridge {
  private readonly channel =
    typeof BroadcastChannel === 'undefined'
      ? undefined
      : new BroadcastChannel(CHANNEL);

  constructor(private readonly database = new BookmarkManagerDatabase()) {}

  async publish(input: ContentChangeInput): Promise<ContentChange> {
    const validated = contentChangeSchema
      .omit({ revision: true, type: true, protocolVersion: true })
      .parse(input);
    const key = `content-revision:v1:${validated.profileId}`;
    const revision = await this.database.transaction(
      'rw',
      this.database.metadata,
      async () => {
        const current = await this.database.metadata.get(key);
        const next = revisionSchema.parse(current?.value ?? 0) + 1;
        await this.database.metadata.put({ key, value: next });
        return next;
      },
    );
    const change = contentChangeSchema.parse({
      ...validated,
      protocolVersion: CONTENT_CHANGE_PROTOCOL_VERSION,
      revision,
      type: 'content.changed',
    });
    this.channel?.postMessage(change);
    return change;
  }

  async revision(profileId: string): Promise<number> {
    const id = z.uuid().parse(profileId);
    return revisionSchema.parse(
      (await this.database.metadata.get(`content-revision:v1:${id}`))?.value ??
        0,
    );
  }

  /** Broadcasts an activation already committed atomically by profile storage. */
  publishProfileActivation(input: ProfileActivationInput): ProfileActivation {
    const activation = profileActivationSchema.parse({
      ...input,
      protocolVersion: PROFILE_ACTIVATION_PROTOCOL_VERSION,
      type: 'profile.activated',
    });
    this.channel?.postMessage(activation);
    return activation;
  }

  /** Reads the durable active profile and its monotonic activation revision. */
  async profileActivation(): Promise<ProfileActivationInput> {
    const [profile, revision] = await this.database.transaction(
      'r',
      this.database.metadata,
      () =>
        Promise.all([
          this.database.metadata.get('activeProfileId'),
          this.database.metadata.get('profile-activation-revision:v1'),
        ]),
    );
    return {
      profileId: activeProfileSchema.parse(profile?.value),
      revision: revisionSchema.parse(revision?.value ?? 0),
    };
  }

  subscribe(receive: (change: ContentChange) => void): () => void {
    if (!this.channel) return () => undefined;
    const listener = (event: MessageEvent<unknown>) => {
      const parsed = contentChangeSchema.safeParse(event.data);
      if (parsed.success) receive(parsed.data);
    };
    this.channel.addEventListener('message', listener);
    return () => this.channel?.removeEventListener('message', listener);
  }

  subscribeProfileActivation(
    receive: (activation: ProfileActivation) => void,
  ): () => void {
    if (!this.channel) return () => undefined;
    const listener = (event: MessageEvent<unknown>) => {
      const parsed = profileActivationSchema.safeParse(event.data);
      if (parsed.success) receive(parsed.data);
    };
    this.channel.addEventListener('message', listener);
    return () => this.channel?.removeEventListener('message', listener);
  }

  close(): void {
    this.channel?.close();
    this.database.close();
  }
}
