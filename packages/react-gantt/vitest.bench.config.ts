import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// Separate from vitest.config.ts: the test setup file registers an `afterEach`
// cleanup that benchmark mode does not provide, and benches want a DOM.
export default defineConfig({
  plugins: [react()],
  test: {
    name: 'react-gantt-bench',
    environment: 'jsdom',
    css: {
      include: [/.+/],
      modules: {
        classNameStrategy: 'non-scoped',
      },
    },
    benchmark: {
      include: ['bench/**/*.bench.{ts,tsx}'],
    },
    // Set PROFILE=1 to emit a V8 CPU profile per bench file into .profile/out.
    ...(process.env.PROFILE
      ? {
          pool: 'forks' as const,
          poolOptions: {
            forks: {
              singleFork: true,
              execArgv: ['--cpu-prof', '--cpu-prof-dir=.profile/out'],
            },
          },
        }
      : {}),
  },
});
