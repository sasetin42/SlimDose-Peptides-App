import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Raise limit — AdminDashboard is intentionally large (lazy loaded only for /admin)
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React runtime — cached across all pages
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Framer Motion — only loaded for pages that animate (VerificationGateway, modals)
          'vendor-motion': ['framer-motion'],
          // Firebase SDK — the actual data layer used by supabase.ts adapter
          'vendor-firebase': ['firebase/app', 'firebase/firestore', 'firebase/auth', 'firebase/storage'],
        },
      },
    },
  },
});
