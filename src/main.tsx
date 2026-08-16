import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import { PostHogProvider } from 'posthog-js/react';
import App from './App.tsx';
import './index.css';

import posthog from 'posthog-js';

const POSTHOG_KEY =
  (import.meta.env.VITE_PUBLIC_POSTHOG_KEY as string | undefined) ||
  'phc_xqroJmmWbhTmjdvmZfCmQGYeufborDqJyNNe97Qis64Q';
const POSTHOG_HOST =
  (import.meta.env.VITE_PUBLIC_POSTHOG_HOST as string | undefined) ||
  'https://us.i.posthog.com';

if (!posthog.__loaded && typeof window !== 'undefined') {
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    capture_exceptions: true,
    debug: false,
    transport: 'XHR',
    advanced_disable_decide: true,
  });
}

const CONVEX_URL =
  (import.meta.env.VITE_CONVEX_URL as string | undefined) ||
  'https://blessed-cuttlefish-644.convex.cloud';

const convex = new ConvexReactClient(CONVEX_URL);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PostHogProvider client={posthog}>
      <ConvexProvider client={convex}>
        <App />
      </ConvexProvider>
    </PostHogProvider>
  </StrictMode>
);
