import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const reactGanttSource = resolve(import.meta.dirname, "../../packages/react-gantt/src/index.ts");

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@am-tools/react-gantt": reactGanttSource,
    },
  },
  test: {
    name: "playground",
    environment: "node",
    benchmark: {
      include: ["bench/**/*.bench.{ts,tsx}"],
    },
    include: [],
  },
});
