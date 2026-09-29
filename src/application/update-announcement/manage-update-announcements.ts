import { z } from 'zod';

import type { UpdateAnnouncementRepository } from './update-announcement-repository';

const installedVersionSchema = z.string().regex(/^\d+\.\d+\.\d+(?:\.\d+)?$/);
const CLAIM_EXPIRY_MS = 5 * 60 * 1_000;

/** Coordinates installation-wide update announcements across extension tabs. */
export class ManageUpdateAnnouncements {
  constructor(
    private readonly repository: UpdateAnnouncementRepository,
    private readonly createId: () => string = () => crypto.randomUUID(),
    private readonly now: () => number = () => Date.now(),
  ) {}

  getPreferences() {
    return this.repository.getPreferences();
  }

  updatePreferences(showAfterUpdate: boolean): Promise<void> {
    return this.repository.updatePreferences(showAfterUpdate);
  }

  async recordUpgrade(
    previousVersion: string,
    version: string,
  ): Promise<boolean> {
    const previous = getAnnouncementVersion(previousVersion);
    const current = getAnnouncementVersion(version);
    if (!isGreaterVersion(current, previous)) return false;
    await this.repository.recordUpgrade(previous, current, this.now());
    return true;
  }

  claim(version: string) {
    const current = getAnnouncementVersion(version);
    const claimedAt = this.now();
    return this.repository.claim(
      current,
      this.createId(),
      claimedAt,
      claimedAt - CLAIM_EXPIRY_MS,
    );
  }

  markShown(version: string, claimId: string): Promise<void> {
    return this.repository.markShown(
      getAnnouncementVersion(version),
      z.uuid().parse(claimId),
    );
  }

  markUnavailable(version: string, claimId: string): Promise<void> {
    return this.repository.markUnavailable(
      getAnnouncementVersion(version),
      z.uuid().parse(claimId),
    );
  }
}

/** Returns the three-part release version used by announcements and changelog headings. */
function getAnnouncementVersion(installedVersion: string): string {
  return installedVersionSchema
    .parse(installedVersion)
    .split('.')
    .slice(0, 3)
    .join('.');
}

function isGreaterVersion(current: string, previous: string): boolean {
  const currentParts = current.split('.').map(Number);
  const previousParts = previous.split('.').map(Number);
  for (let index = 0; index < currentParts.length; index += 1) {
    if (currentParts[index]! > previousParts[index]!) return true;
    if (currentParts[index]! < previousParts[index]!) return false;
  }
  return false;
}
