export interface BrowserSearchAdapter {
  isAvailable(): boolean;
  query(text: string, opening: 'current-tab' | 'new-tab'): Promise<void>;
}

type SearchApi = {
  query(input: {
    disposition: 'CURRENT_TAB' | 'NEW_TAB';
    text: string;
  }): Promise<void> | void;
};

/** Uses only the browser's extension Search API; it never constructs provider URLs. */
export function createBrowserSearchAdapter(
  host: typeof globalThis = globalThis,
): BrowserSearchAdapter {
  const extensionHost = host as typeof globalThis & {
    browser?: { search?: SearchApi };
    chrome?: { search?: SearchApi };
  };
  const api = extensionHost.browser?.search ?? extensionHost.chrome?.search;
  return {
    isAvailable: () => typeof api?.query === 'function',
    async query(text, opening) {
      const query = text.trim();
      if (!api?.query) throw new Error('browser-search-api-unavailable');
      if (!query) throw new Error('browser-search-query-empty');
      await api.query({
        disposition: opening === 'new-tab' ? 'NEW_TAB' : 'CURRENT_TAB',
        text: query,
      });
    },
  };
}
