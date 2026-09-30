import { lazy, ComponentType } from 'react';

/**
 * Resilient lazy loader for code-split components.
 * When a new deployment occurs and the user's browser attempts to load an old chunk that no longer
 * exists on the server, the server responds with index.html (text/html).
 * The browser then throws:
 * Failed to load module script: Expected a JavaScript-or-Wasm module script but the server responded with a MIME type of 'text/html'.
 *
 * This wrapper catches that dynamic import failure, forces a cache-busting reload of the page
 * (at most once to avoid reload loops), allowing the user to seamlessly get the newest version of the app.
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>
): ReturnType<typeof lazy<T>> {
  return lazy<T>(async () => {
    const pageAlreadyRefreshedKey = 'slimdose_chunk_refreshed';

    try {
      const module = await factory();
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(pageAlreadyRefreshedKey);
      }
      return module;
    } catch (error: any) {
      const errorMessage = String(error?.message || error || '');
      const isMimeOrChunkError =
        errorMessage.includes('Failed to load module script') ||
        errorMessage.includes('MIME type of text/html') ||
        errorMessage.includes('dynamically imported module') ||
        errorMessage.includes('Loading chunk') ||
        errorMessage.includes('error loading dynamically imported module');

      if (typeof window !== 'undefined' && isMimeOrChunkError) {
        const hasRefreshed = sessionStorage.getItem(pageAlreadyRefreshedKey);
        if (!hasRefreshed) {
          sessionStorage.setItem(pageAlreadyRefreshedKey, 'true');
          window.location.reload();
          return new Promise(() => {});
        }
      }

      throw error;
    }
  });
}
