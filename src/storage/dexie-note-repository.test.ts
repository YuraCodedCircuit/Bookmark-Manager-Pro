import 'fake-indexeddb/auto';

import { afterEach, describe, expect, it } from 'vitest';

import { BookmarkManagerDatabase } from './database';
import { DexieNoteRepository } from './dexie-note-repository';

const databases: BookmarkManagerDatabase[] = [];
const profileId = '11111111-1111-4111-8111-111111111111';
const otherProfileId = '22222222-2222-4222-8222-222222222222';

function setup() {
  const database = new BookmarkManagerDatabase(`notes-${crypto.randomUUID()}`);
  databases.push(database);
  return { database, repository: new DexieNoteRepository(database) };
}

async function addProfile(database: BookmarkManagerDatabase, id: string) {
  await database.profiles.add({ id, username: id, createdAt: 1, updatedAt: 1 });
}

afterEach(async () => {
  await Promise.all(
    databases.splice(0).map(async (database) => {
      database.close();
      await database.delete();
    }),
  );
});

describe('DexieNoteRepository', () => {
  it('creates one Home folder and persists a validated note', async () => {
    const { database, repository } = setup();
    await addProfile(database, profileId);

    const initial = await repository.load(profileId);
    const home = initial.folders.find((folder) => folder.isHome);
    expect(home).toBeDefined();
    const note = await repository.save({
      profileId,
      folderId: home!.id,
      title: '  Same title  ',
      body: '# Body',
      important: false,
    });

    expect(note.title).toBe('Same title');
    await expect(repository.load(profileId)).resolves.toMatchObject({
      notes: [expect.objectContaining({ id: note.id, revision: 1 })],
    });
  });

  it('rejects stale saves and cross-profile identifiers', async () => {
    const { database, repository } = setup();
    await addProfile(database, profileId);
    await addProfile(database, otherProfileId);
    const home = (await repository.load(profileId)).folders[0]!;
    const note = await repository.save({
      profileId,
      folderId: home.id,
      title: 'A',
      body: '',
      important: false,
    });
    await repository.save({ ...note, body: 'new' });

    await expect(repository.save({ ...note, body: 'stale' })).rejects.toThrow(
      'note-save-conflict',
    );
    await expect(
      repository.deleteNote(otherProfileId, note.id),
    ).rejects.toThrow('note-not-found');
  });

  it('moves or permanently deletes contained notes when deleting a subtree', async () => {
    const { database, repository } = setup();
    await addProfile(database, profileId);
    const home = (await repository.load(profileId)).folders[0]!;
    const folder = await repository.createFolder(profileId, home.id, 'Child');
    await repository.save({
      profileId,
      folderId: folder.id,
      title: 'A',
      body: '',
      important: false,
    });
    const impact = await repository.inspectFolderDeletion(profileId, folder.id);
    await repository.deleteFolder({
      profileId,
      folderId: folder.id,
      deleteNotes: false,
      expectedFolderCount: impact.folderCount,
      expectedNoteCount: impact.noteCount,
    });
    expect((await repository.load(profileId)).notes[0]?.folderId).toBe(home.id);

    const second = await repository.createFolder(profileId, home.id, 'Second');
    await repository.save({
      profileId,
      folderId: second.id,
      title: 'B',
      body: '',
      important: false,
    });
    const secondImpact = await repository.inspectFolderDeletion(
      profileId,
      second.id,
    );
    await repository.deleteFolder({
      profileId,
      folderId: second.id,
      deleteNotes: true,
      expectedFolderCount: 1,
      expectedNoteCount: 1,
    });
    expect(
      (await repository.load(profileId)).notes.map((note) => note.title),
    ).toEqual(['A']);
    expect(secondImpact).toEqual({ folderCount: 1, noteCount: 1 });
  });
});
