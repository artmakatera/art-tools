/**
 * Type stub for the `@am/react-gantt/style.css` export.
 *
 * The package's `exports` map points that subpath's `types` condition here, and
 * `files` ships it — but the file did not exist, which only stayed invisible
 * because both consumers supply an ambient `declare module '*.css'` (Vite via
 * `vite/client`, Next via `next/types/global.d.ts`). It would surface the moment
 * anyone enables `noUncheckedSideEffectImports` or consumes the package outside
 * those two toolchains.
 *
 * The stylesheet is imported for its side effect:
 *   import "@am/react-gantt/style.css";
 */
declare const styleSheetUrl: string;
export default styleSheetUrl;
