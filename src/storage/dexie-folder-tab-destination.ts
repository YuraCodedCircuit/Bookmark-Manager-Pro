import { BookmarkManagerDatabase } from './database';

/** Checks both owners afresh on open and claim without retaining a worker database handle. */
export async function folderTabDestinationExists(
  profileId: string,
  folderId: string,
): Promise<boolean> {
  const database = new BookmarkManagerDatabase();
  try {
    return await database.transaction(
      'r',
      database.folders,
      database.profiles,
      async () => {
        const folder = await database.folders.get(folderId);
        return (
          folder?.profileId === profileId &&
          !!(await database.profiles.get(profileId))
        );
      },
    );
  } finally {
    database.close();
  }
}
