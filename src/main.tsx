import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import { PostHogProvider } from 'posthog-js/react';
import App from './App.tsx';
import './index.css';

import posthog from 'posthog-js';

const POSTHOG_KEY = import.meta.env.VITE_PUBLIC_POSTHOG_KEY as string | undefined;
const POSTHOG_HOST =
  (import.meta.env.VITE_PUBLIC_POSTHOG_HOST as string | undefined) ||
  'https://us.i.posthog.com';

const isPostHogEnabled = Boolean(POSTHOG_KEY && POSTHOG_KEY.trim() !== '');

if (isPostHogEnabled && !posthog.__loaded && typeof window !== 'undefined') {
  try {
    posthog.init(POSTHOG_KEY!, {
      api_host: POSTHOG_HOST,
      capture_exceptions: false,
      autocapture: false,
      capture_pageview: false,
      disable_session_recording: true,
      advanced_disable_decide: true,
      request_batching: false,
      cross_subdomain_cookie: false,
      debug: false,
      persistence: 'memory',
      on_xhr_error: () => {},
    });
  } catch (err) {
    console.debug('PostHog initialization bypassed:', err);
  }
}

const CONVEX_URL =
  (import.meta.env.VITE_CONVEX_URL as string | undefined) ||
  'https://blessed-cuttlefish-644.convex.cloud';

const convex = new ConvexReactClient(CONVEX_URL);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isPostHogEnabled ? (
      <PostHogProvider client={posthog}>
        <ConvexProvider client={convex}>
          <App />
        </ConvexProvider>
      </PostHogProvider>
    ) : (
      <ConvexProvider client={convex}>
        <App />
      </ConvexProvider>
    )}
  </StrictMode>
);
