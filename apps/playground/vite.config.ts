import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const reactGanttSource = resolve(import.meta.dirname, '../../packages/react-gantt/src/index.ts');

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@am/react-gantt': reactGanttSource,
    },
  },
  server: {
    port: 5173,
  },
});
