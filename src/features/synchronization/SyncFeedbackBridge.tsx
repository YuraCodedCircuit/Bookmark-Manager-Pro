import { useEffect, useEffectEvent } from 'react';
import { BookmarkManagerDatabase } from '../../storage/database';
import { SyncRepository } from '../../storage/sync-repository';

/** Delivers durable, content-free service notices once across open extension surfaces. */
export function SyncFeedbackBridge({
  profileId,
  onEvent,
}: {
  profileId: string;
  onEvent(event: string): void;
}) {
  const receive = useEffectEvent(onEvent);
  useEffect(() => {
    const database = new BookmarkManagerDatabase();
    const subscription = new SyncRepository(database).observeFeedback(
      profileId,
      (event) => receive(event),
    );
    return () => {
      subscription.unsubscribe();
      database.close();
    };
  }, [profileId]);
  return null;
}
