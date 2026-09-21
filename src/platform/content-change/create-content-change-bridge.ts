import { ContentChangeBridge } from './content-change-bridge';

/** Creates one cross-context content-change bridge for an extension surface. */
export function createContentChangeBridge(
  notifyBackground?: () => void,
): ContentChangeBridge {
  return new ContentChangeBridge(undefined, notifyBackground);
}
