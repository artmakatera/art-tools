import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    name: "react-gantt",
    environment: "jsdom",
    setupFiles: ["./src/tests/setup.ts"],
    env: {
      // Pinned deliberately, and it must be a DST zone. Nearly all of this
      // library's date math is *civil* time (`getFullYear`/`getMonth`/`getDate`,
      // `civilDayIndex`, `instantAt`), so its correctness depends on the
      // ambient zone — and a UTC runner never has a 23- or 25-hour day, so it
      // cannot observe the class of bug those code paths are written to avoid.
      // Unpinned, results also differ between a developer's machine and CI.
      TZ: "Europe/Warsaw",
    },
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    css: {
      include: [/.+/],
      modules: {
        classNameStrategy: "non-scoped",
      },
    },
    restoreMocks: true,
  },
});
