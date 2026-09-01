import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import { PostHogProvider } from 'posthog-js/react';
import App from './App.tsx';
import './index.css';

import posthog from 'posthog-js';

// Global error and warning safety filter for non-fatal Firebase leases and detached web-vitals observers
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    const msg = event?.message || String(event || '');
    if (
      msg.includes("Cannot read properties of undefined (reading 'startTime')") ||
      msg.includes('reportAllChanges') ||
      msg.includes('Failed to obtain primary lease')
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return true;
    }
  }, true);

  window.addEventListener('unhandledrejection', (event) => {
    const reason = String(event?.reason?.message || event?.reason || '');
    if (
      reason.includes("Cannot read properties of undefined (reading 'startTime')") ||
      reason.includes('reportAllChanges') ||
      reason.includes('Failed to obtain primary lease')
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);

  const origError = console.error;
  const origWarn = console.warn;
  console.error = (...args: any[]) => {
    const str = args.map(a => String(a?.message || a || '')).join(' ');
    if (
      str.includes('Failed to obtain primary lease') ||
      str.includes('primary lease') ||
      str.includes("reading 'startTime'") ||
      str.includes('reportAllChanges') ||
      str.includes('Could not reach Cloud Firestore backend') ||
      str.includes('operate in offline mode') ||
      str.includes('createRoot() on a container') ||
      str.includes('ERR_CONNECTION_REFUSED') ||
      str.includes('Failed to fetch')
    ) {
      return;
    }
    origError.apply(console, args);
  };
  console.warn = (...args: any[]) => {
    const str = args.map(a => String(a?.message || a || '')).join(' ');
    if (
      str.includes('Failed to obtain primary lease') ||
      str.includes('primary lease') ||
      str.includes("reading 'startTime'") ||
      str.includes('reportAllChanges') ||
      str.includes('Could not reach Cloud Firestore backend') ||
      str.includes('operate in offline mode') ||
      str.includes('createRoot() on a container') ||
      str.includes('ERR_CONNECTION_REFUSED') ||
      str.includes('Failed to fetch')
    ) {
      return;
    }
    origWarn.apply(console, args);
  };
}

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
      capture_performance: false,
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

const CONVEX_URL = import.meta.env.VITE_CONVEX_URL as string | undefined;
const isConvexEnabled = Boolean(CONVEX_URL && CONVEX_URL.trim() !== '');

const convex = isConvexEnabled ? new ConvexReactClient(CONVEX_URL!) : null;

function RootProvider({ children }: { children: React.ReactNode }) {
  let content = <>{children}</>;

  if (isConvexEnabled && convex) {
    content = <ConvexProvider client={convex}>{content}</ConvexProvider>;
  }

  if (isPostHogEnabled) {
    content = <PostHogProvider client={posthog}>{content}</PostHogProvider>;
  }

  return content;
}

const container = document.getElementById('root')!;
const globalWithRoot = window as unknown as { __slimdose_root__?: ReturnType<typeof createRoot> };
const root = globalWithRoot.__slimdose_root__ || createRoot(container);
globalWithRoot.__slimdose_root__ = root;

root.render(
  <StrictMode>
    <RootProvider>
      <App />
    </RootProvider>
  </StrictMode>
);
