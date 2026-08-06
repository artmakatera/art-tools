import type { ReactNode } from "react";
import { Nav } from "@/components/nav";

export default function ExamplesLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 px-4 py-8 md:block dark:border-slate-800">
        <div className="sticky top-8">
          <Nav />
        </div>
      </aside>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
