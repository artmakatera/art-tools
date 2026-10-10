import type { ReactNode } from "react";
import { ApiNav } from "@/components/api-nav";

export default function ApiLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex max-w-7xl">
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 px-4 py-8 md:block dark:border-slate-800">
        <div className="docs-sidebar">
          <ApiNav />
        </div>
      </aside>
      <main id="main-content" tabIndex={-1} className="min-w-0 flex-1">
        {children}
      </main>
    </div>
  );
}
