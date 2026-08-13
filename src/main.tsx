import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import { PostHogProvider } from 'posthog-js/react';
import App from './App.tsx';
import './index.css';

const POSTHOG_KEY =
  (import.meta.env.VITE_PUBLIC_POSTHOG_KEY as string | undefined) ||
  'phc_xqroJmmWbhTmjdvmZfCmQGYeufborDqJyNNe97Qis64Q';
const POSTHOG_HOST =
  (import.meta.env.VITE_PUBLIC_POSTHOG_HOST as string | undefined) ||
  'https://us.i.posthog.com';

const posthogOptions = {
  api_host: POSTHOG_HOST,
  defaults: '2025-05-24' as const,
  capture_exceptions: true,
  debug: false,
  transport: 'XHR' as const, // Use standard XHR instead of fetch/QUIC stream to prevent QUIC_TOO_MANY_RTOS & AbortSignal warnings
  advanced_disable_decide: true, // Prevents legacy feature flags endpoint request warning if feature flags are not used
};

const CONVEX_URL =
  (import.meta.env.VITE_CONVEX_URL as string | undefined) ||
  'https://blessed-cuttlefish-644.convex.cloud';

const convex = new ConvexReactClient(CONVEX_URL);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PostHogProvider apiKey={POSTHOG_KEY} options={posthogOptions}>
      <ConvexProvider client={convex}>
        <App />
      </ConvexProvider>
    </PostHogProvider>
  </StrictMode>
);
