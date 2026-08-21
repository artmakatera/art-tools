import { copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import dts from "vite-plugin-dts";

/** Copy the hand-written `style.css` type stub into `dist`; tsc will not emit it. */
function copyStyleTypes(): Plugin {
  return {
    name: "copy-style-css-types",
    closeBundle() {
      copyFileSync(
        resolve(import.meta.dirname, "src/style.css.d.ts"),
        resolve(import.meta.dirname, "dist/style.css.d.ts"),
      );
    },
  };
}

/**
 * Emit `dist/index.d.cts` for the `require` condition.
 *
 * Only correct while `bundleTypes` is on: a flattened declaration has no
 * relative specifiers to rewrite for CJS resolution. Turn it off and this
 * silently emits a `.d.cts` whose `./types` imports resolve as ESM.
 */
function emitCjsTypes(): Plugin {
  return {
    name: "emit-cjs-types",
    closeBundle() {
      const esmTypes = resolve(import.meta.dirname, "dist/index.d.ts");
      writeFileSync(
        resolve(import.meta.dirname, "dist/index.d.cts"),
        readFileSync(esmTypes, "utf8"),
      );
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    dts({
      include: ["src"],
      exclude: ["src/tests/**", "src/**/*.stories.*"],
      tsconfigPath: "./tsconfig.build.json",
      bundleTypes: true,
    }),
    copyStyleTypes(),
    emitCjsTypes(),
  ],
  build: {
    lib: {
      entry: "src/index.ts",
      formats: ["es", "cjs"],
      fileName: (format) => `index.${format === "es" ? "mjs" : "cjs"}`,
      cssFileName: "style",
    },
    rollupOptions: {
      external: ["react", "react-dom", "react/jsx-runtime"],
      output: {
        globals: {
          react: "React",
          "react-dom": "ReactDOM",
          "react/jsx-runtime": "jsxRuntime",
        },
      },
    },
    sourcemap: true,
    target: "es2022",
  },
});
