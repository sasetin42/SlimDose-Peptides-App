import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Only project source tests — exclude vendored tooling (.temp_ag_kit etc.)
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
