import { z } from 'zod';

import {
  bookmarkSchema,
  itemAppearanceSchema,
  type Bookmark,
  type ItemAppearance,
} from '../../domain/bookmark';
import { safeBookmarkUrlSchema } from '../../domain/bookmark-url';
import {
  detailsTableTransparencySchema,
  folderBackgroundAppearanceSchema,
  folderSchema,
  navigationTransparencySchema,
  type FolderBackgroundAppearance,
  type Folder,
} from '../../domain/folder';
import {
  bookmarkGroupBySchema,
  bookmarkSortBySchema,
  bookmarkSortDirectionSchema,
  bookmarkViewSchema,
  cardSizeSchema,
  cardSpacingSchema,
  type ProfileSettings,
} from '../../domain/profile-settings';
import type { BookmarkRepository, FolderContents } from './bookmark-repository';
import type { UndoProfileState } from '../../domain/undo-history';

const MAX_ID_ATTEMPTS = 5;

const creationInputSchema = z.object({
  cardAppearance: itemAppearanceSchema,
  tags: z.array(z.string().trim().min(1).max(80)).max(50),
  note: z.string().trim().max(10_000),
  parentId: z.uuid(),
  profileId: z.uuid(),
  title: z.string().trim().min(1).max(200),
  bookmarkView: bookmarkViewSchema.optional(),
  cardSize: cardSizeSchema.optional(),
  cardSpacing: cardSpacingSchema.optional(),
  bookmarkSortBy: bookmarkSortBySchema.optional(),
  bookmarkSortDirection: bookmarkSortDirectionSchema.optional(),
  bookmarkGroupBy: bookmarkGroupBySchema.optional(),
});
const bookmarkInputSchema = creationInputSchema.extend({
  url: safeBookmarkUrlSchema,
});

export interface CreateFolderInput {
  cardAppearance: ItemAppearance;
  tags: readonly string[];
  note: string;
  parentId: string;
  profileId: string;
  title: string;
  bookmarkView?: ProfileSettings['bookmarkView'];
  cardSize?: ProfileSettings['cardSize'];
  cardSpacing?: ProfileSettings['cardSpacing'];
  bookmarkSortBy?: ProfileSettings['bookmarkSortBy'];
  bookmarkSortDirection?: ProfileSettings['bookmarkSortDirection'];
  bookmarkGroupBy?: ProfileSettings['bookmarkGroupBy'];
}

export interface CreateBookmarkInput extends CreateFolderInput {
  url: string;
}

export type UpdateFolderInput = Omit<
  CreateFolderInput,
  'parentId' | 'profileId'
>;
export type UpdateBookmarkInput = Omit<
  CreateBookmarkInput,
  'parentId' | 'profileId'
>;
export type NavigationItem =
  { kind: 'bookmark'; value: Bookmark } | { kind: 'folder'; value: Folder };

export interface NavigationItems {
  favorites: readonly NavigationItem[];
  recent: readonly NavigationItem[];
}

export interface CopiedItemResult {
  itemCount: number;
  rootItemId: string;
}

/** Coordinates validated creation and querying of profile-local content. */
export class ManageBookmarks {
  constructor(
    private readonly repository: BookmarkRepository,
    private readonly createId: () => string = () => crypto.randomUUID(),
    private readonly now: () => number = () => Date.now(),
  ) {}

  async ensureRoot(profileId: string): Promise<Folder> {
    const timestamp = this.now();
    const root = folderSchema.parse({
      backgroundAppearance: {
        colors: ['#2f80c9', '#185a82', '#0b1f3a'],
        direction: 135,
        kind: 'gradient',
      },
      bookmarkView: 'card',
      cardSize: 'small',
      cardSpacing: 'comfortable',
      bookmarkSortBy: 'manual',
      bookmarkSortDirection: 'ascending',
      bookmarkGroupBy: 'none',
      detailsTableTransparency: 0,
      includeNavigationBackground: true,
      navigationTransparency: 70,
      cardAppearance: { kind: 'color', value: '#2f7de1' },
      createdAt: timestamp,
      id: await this.createUniqueItemId(),
      isRoot: true,
      index: 0,
      note: '',
      tags: [],
      title: 'Home',
      parentId: null,
      profileId,
      updatedAt: timestamp,
    });
    return this.repository.ensureRoot(profileId, root);
  }

  listFolders(profileId: string): Promise<readonly Folder[]> {
    return this.repository.listFolders(profileId);
  }

  listBookmarks(profileId: string): Promise<readonly Bookmark[]> {
    return this.repository.listBookmarks(profileId);
  }

  listContents(profileId: string, parentId: string): Promise<FolderContents> {
    return this.repository.listContents(profileId, parentId);
  }

  /** Captures validated profile content for calculating a minimal undo patch. */
  captureUndoState(profileId: string): Promise<UndoProfileState> {
    return this.repository.captureProfileState(z.uuid().parse(profileId));
  }

  /** Atomically restores only the records affected by one history operation. */
  restoreUndoState(
    profileId: string,
    state: UndoProfileState,
    affectedIds: {
      bookmarkIds: readonly string[];
      favoriteIds: readonly string[];
      folderIds: readonly string[];
    },
  ): Promise<void> {
    return this.repository.restoreProfileState(
      z.uuid().parse(profileId),
      state,
      affectedIds,
    );
  }

  async listNavigationItems(profileId: string): Promise<NavigationItems> {
    const validatedProfileId = z.uuid().parse(profileId);
    const [bookmarks, folders, favorites] = await Promise.all([
      this.repository.listBookmarks(validatedProfileId),
      this.repository.listFolders(validatedProfileId),
      this.repository.listFavorites(validatedProfileId),
    ]);
    const items = new Map<string, NavigationItem>([
      ...bookmarks.map(
        (value) => [value.id, { kind: 'bookmark' as const, value }] as const,
      ),
      ...folders.map(
        (value) => [value.id, { kind: 'folder' as const, value }] as const,
      ),
    ]);
    return {
      favorites: favorites.flatMap((favorite) => {
        const item = items.get(favorite.itemId);
        return item && item.kind === favorite.kind ? [item] : [];
      }),
      recent: [...items.values()]
        .filter((item) => item.kind === 'bookmark' || !item.value.isRoot)
        .sort((left, right) => right.value.createdAt - left.value.createdAt)
        .slice(0, 5),
    };
  }

  async setFavorite(
    profileId: string,
    itemId: string,
    favorite: boolean,
  ): Promise<void> {
    const validatedProfileId = z.uuid().parse(profileId);
    const validatedItemId = z.uuid().parse(itemId);
    const [folder, bookmark] = await Promise.all([
      this.repository.getFolder(validatedProfileId, validatedItemId),
      this.repository.getBookmark(validatedProfileId, validatedItemId),
    ]);
    const kind = folder ? 'folder' : bookmark ? 'bookmark' : undefined;
    if (!kind) throw new Error('favorite-item-not-found');
    if (!favorite) {
      await this.repository.removeFavorite(validatedProfileId, validatedItemId);
      return;
    }
    await this.repository.setFavorite({
      favoritedAt: this.now(),
      itemId: validatedItemId,
      kind,
      profileId: validatedProfileId,
    });
  }

  async deleteItem(profileId: string, itemId: string): Promise<void> {
    const validatedProfileId = z.uuid().parse(profileId);
    const validatedItemId = z.uuid().parse(itemId);
    const folder = await this.repository.getFolder(
      validatedProfileId,
      validatedItemId,
    );
    if (folder?.isRoot) throw new Error('root-folder-cannot-delete');
    if (
      !folder &&
      !(await this.repository.getBookmark(validatedProfileId, validatedItemId))
    )
      throw new Error('delete-item-not-found');
    await this.repository.deleteItem(validatedProfileId, validatedItemId);
  }

  /**
   * Moves or reorders one profile-local item after validating the destination.
   * The optional callback runs after validation and immediately before the
   * repository write so presentation code can clear transient drag feedback.
   */
  async moveItem(
    profileId: string,
    itemId: string,
    destinationParentId: string,
    destinationIndex: number,
    onValidated?: () => void,
  ): Promise<void> {
    const validatedProfileId = z.uuid().parse(profileId);
    const validatedItemId = z.uuid().parse(itemId);
    const validatedParentId = z.uuid().parse(destinationParentId);
    const validatedIndex = z
      .number()
      .int()
      .nonnegative()
      .parse(destinationIndex);
    const destination = await this.repository.getFolder(
      validatedProfileId,
      validatedParentId,
    );
    if (!destination) throw new Error('destination-folder-not-found');
    const folder = await this.repository.getFolder(
      validatedProfileId,
      validatedItemId,
    );
    if (folder) {
      if (folder.isRoot || folder.id === validatedParentId)
        throw new Error('invalid-folder-destination');
      const folders = await this.repository.listFolders(validatedProfileId);
      let current = destination;
      const visited = new Set<string>();
      while (current.parentId) {
        if (current.id === folder.id) throw new Error('folder-cycle-detected');
        if (visited.has(current.id)) throw new Error('folder-cycle-detected');
        visited.add(current.id);
        const parent = folders.find(
          (candidate) => candidate.id === current.parentId,
        );
        if (!parent) break;
        current = parent;
      }
    } else if (
      !(await this.repository.getBookmark(validatedProfileId, validatedItemId))
    ) {
      throw new Error('move-item-not-found');
    }
    onValidated?.();
    await this.repository.moveItem(
      validatedProfileId,
      validatedItemId,
      validatedParentId,
      validatedIndex,
    );
  }

  /** Recursively clones one profile-local item into a validated folder. */
  async copyItem(
    profileId: string,
    itemId: string,
    destinationParentId: string,
  ): Promise<CopiedItemResult> {
    const validatedProfileId = z.uuid().parse(profileId);
    const validatedItemId = z.uuid().parse(itemId);
    const validatedParentId = z.uuid().parse(destinationParentId);
    const [destination, sourceFolder, sourceBookmark] = await Promise.all([
      this.repository.getFolder(validatedProfileId, validatedParentId),
      this.repository.getFolder(validatedProfileId, validatedItemId),
      this.repository.getBookmark(validatedProfileId, validatedItemId),
    ]);
    if (!destination) throw new Error('destination-folder-not-found');
    if (!sourceFolder && !sourceBookmark)
      throw new Error('copy-item-not-found');
    if (sourceFolder?.isRoot) throw new Error('root-folder-cannot-copy');

    const timestamp = this.now();
    const destinationIndex = await this.repository.nextIndex(
      validatedProfileId,
      validatedParentId,
    );
    const reservedIds = new Set<string>();
    const createCopyId = async () => {
      for (let attempt = 0; attempt < MAX_ID_ATTEMPTS; attempt += 1) {
        const id = this.createId();
        if (
          !reservedIds.has(id) &&
          (await this.repository.isItemIdAvailable(id))
        ) {
          reservedIds.add(id);
          return id;
        }
      }
      throw new Error('content-id-generation-failed');
    };

    if (sourceBookmark) {
      const rootItemId = await createCopyId();
      await this.repository.addItems(
        [
          bookmarkSchema.parse({
            ...sourceBookmark,
            createdAt: timestamp,
            id: rootItemId,
            index: destinationIndex,
            parentId: validatedParentId,
            updatedAt: timestamp,
          }),
        ],
        [],
        validatedParentId,
        timestamp,
      );
      return { itemCount: 1, rootItemId };
    }

    const [profileFolders, profileBookmarks] = await Promise.all([
      this.repository.listFolders(validatedProfileId),
      this.repository.listBookmarks(validatedProfileId),
    ]);
    const descendantIds = new Set([validatedItemId]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const folder of profileFolders) {
        if (
          folder.parentId &&
          descendantIds.has(folder.parentId) &&
          !descendantIds.has(folder.id)
        ) {
          descendantIds.add(folder.id);
          changed = true;
        }
      }
    }
    if (descendantIds.has(validatedParentId))
      throw new Error('invalid-folder-destination');

    const idMap = new Map<string, string>();
    for (const folder of profileFolders.filter(({ id }) =>
      descendantIds.has(id),
    ))
      idMap.set(folder.id, await createCopyId());
    const copiedFolders = profileFolders
      .filter(({ id }) => descendantIds.has(id))
      .map((folder) =>
        folderSchema.parse({
          ...folder,
          createdAt: timestamp,
          id: idMap.get(folder.id),
          index:
            folder.id === validatedItemId ? destinationIndex : folder.index,
          isRoot: false,
          parentId:
            folder.id === validatedItemId
              ? validatedParentId
              : idMap.get(folder.parentId ?? ''),
          updatedAt: timestamp,
        }),
      );
    const copiedBookmarks: Bookmark[] = [];
    for (const bookmark of profileBookmarks.filter(({ parentId }) =>
      descendantIds.has(parentId),
    )) {
      copiedBookmarks.push(
        bookmarkSchema.parse({
          ...bookmark,
          createdAt: timestamp,
          id: await createCopyId(),
          parentId: idMap.get(bookmark.parentId),
          updatedAt: timestamp,
        }),
      );
    }
    const rootItemId = idMap.get(validatedItemId);
    if (!rootItemId) throw new Error('copy-item-not-found');
    await this.repository.addItems(
      copiedBookmarks,
      copiedFolders,
      validatedParentId,
      timestamp,
    );
    return {
      itemCount: copiedFolders.length + copiedBookmarks.length,
      rootItemId,
    };
  }

  async createBookmark(input: CreateBookmarkInput): Promise<void> {
    const value = bookmarkInputSchema.parse(input);
    await this.assertParent(value.profileId, value.parentId);
    const timestamp = this.now();
    const index = await this.repository.nextIndex(
      value.profileId,
      value.parentId,
    );
    await this.repository.addBookmark(
      bookmarkSchema.parse({
        ...value,
        id: await this.createUniqueItemId(),
        index,
        createdAt: timestamp,
        updatedAt: timestamp,
      }),
    );
  }

  async hasBookmarkWithUrl(
    profileId: string,
    url: string,
    excludingBookmarkId?: string,
  ): Promise<boolean> {
    const validatedProfileId = z.uuid().parse(profileId);
    const normalizedUrl = safeBookmarkUrlSchema.parse(url);
    return (await this.repository.listBookmarks(validatedProfileId)).some(
      (bookmark) =>
        bookmark.id !== excludingBookmarkId && bookmark.url === normalizedUrl,
    );
  }

  async createFolder(input: CreateFolderInput): Promise<void> {
    const value = creationInputSchema.parse(input);
    await this.assertParent(value.profileId, value.parentId);
    const timestamp = this.now();
    const index = await this.repository.nextIndex(
      value.profileId,
      value.parentId,
    );
    await this.repository.addFolder(
      folderSchema.parse({
        backgroundAppearance: { kind: 'color', value: '#0b121a' },
        bookmarkView: value.bookmarkView ?? 'card',
        cardSize: value.cardSize ?? 'medium',
        cardSpacing: value.cardSpacing ?? 'comfortable',
        bookmarkSortBy: value.bookmarkSortBy ?? 'manual',
        bookmarkSortDirection: value.bookmarkSortDirection ?? 'ascending',
        bookmarkGroupBy: value.bookmarkGroupBy ?? 'none',
        detailsTableTransparency: 0,
        includeNavigationBackground: false,
        navigationTransparency: 45,
        cardAppearance: value.cardAppearance,
        createdAt: timestamp,
        id: await this.createUniqueItemId(),
        isRoot: false,
        index,
        note: value.note,
        parentId: value.parentId,
        profileId: value.profileId,
        tags: value.tags,
        title: value.title,
        updatedAt: timestamp,
      }),
    );
  }

  /** Updates editable bookmark fields while preserving identity and placement. */
  async updateBookmark(
    profileId: string,
    bookmarkId: string,
    input: UpdateBookmarkInput,
  ): Promise<void> {
    const existing = await this.repository.getBookmark(profileId, bookmarkId);
    if (!existing) throw new Error('bookmark-not-found');
    const value = bookmarkInputSchema
      .omit({ parentId: true, profileId: true })
      .parse(input);
    await this.repository.updateBookmark(
      bookmarkSchema.parse({
        ...existing,
        ...value,
        updatedAt: this.now(),
      }),
    );
  }

  /** Updates editable folder fields while preserving identity and placement. */
  async updateFolder(
    profileId: string,
    folderId: string,
    input: UpdateFolderInput,
  ): Promise<void> {
    const existing = await this.repository.getFolder(profileId, folderId);
    if (!existing || existing.isRoot) throw new Error('folder-not-found');
    const value = creationInputSchema
      .omit({ parentId: true, profileId: true })
      .parse(input);
    await this.repository.updateFolder(
      folderSchema.parse({
        ...existing,
        ...value,
        updatedAt: this.now(),
      }),
    );
  }

  /** Atomically saves the open folder's background and content view. */
  async updateFolderStyle(
    profileId: string,
    folderId: string,
    input: {
      backgroundAppearance: FolderBackgroundAppearance;
      bookmarkView: ProfileSettings['bookmarkView'];
      cardSize: ProfileSettings['cardSize'];
      cardSpacing: NonNullable<ProfileSettings['cardSpacing']>;
      bookmarkSortBy: NonNullable<ProfileSettings['bookmarkSortBy']>;
      bookmarkSortDirection: NonNullable<
        ProfileSettings['bookmarkSortDirection']
      >;
      bookmarkGroupBy: NonNullable<ProfileSettings['bookmarkGroupBy']>;
      detailsTableTransparency: number;
      includeNavigationBackground: boolean;
      navigationTransparency: number;
    },
  ): Promise<void> {
    const existing = await this.repository.getFolder(profileId, folderId);
    if (!existing) throw new Error('folder-not-found');
    await this.repository.updateFolder(
      folderSchema.parse({
        ...existing,
        backgroundAppearance: folderBackgroundAppearanceSchema.parse(
          input.backgroundAppearance,
        ),
        bookmarkView: bookmarkViewSchema.parse(input.bookmarkView),
        cardSize: cardSizeSchema.parse(input.cardSize),
        cardSpacing: cardSpacingSchema.parse(input.cardSpacing),
        bookmarkSortBy: bookmarkSortBySchema.parse(input.bookmarkSortBy),
        bookmarkSortDirection: bookmarkSortDirectionSchema.parse(
          input.bookmarkSortDirection,
        ),
        bookmarkGroupBy: bookmarkGroupBySchema.parse(input.bookmarkGroupBy),
        detailsTableTransparency: detailsTableTransparencySchema.parse(
          input.detailsTableTransparency,
        ),
        includeNavigationBackground: input.includeNavigationBackground,
        navigationTransparency: navigationTransparencySchema.parse(
          input.navigationTransparency,
        ),
        updatedAt: this.now(),
      }),
    );
  }

  private async assertParent(
    profileId: string,
    parentId: string,
  ): Promise<void> {
    if (!(await this.repository.getFolder(profileId, parentId))) {
      throw new Error('parent-folder-not-found');
    }
  }

  private async createUniqueItemId(): Promise<string> {
    for (let attempt = 0; attempt < MAX_ID_ATTEMPTS; attempt += 1) {
      const id = this.createId();
      if (await this.repository.isItemIdAvailable(id)) return id;
    }
    throw new Error('content-id-generation-failed');
  }
}
