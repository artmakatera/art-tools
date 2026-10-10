import { highlight } from "@/lib/highlight";

export async function ApiCode({ code, label }: { code: string; label: string }) {
  const html = await highlight(code, "tsx");
  return (
    <div
      // Keyboard focus makes long signatures scrollable without a pointer.
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
      tabIndex={0}
      role="region"
      aria-label={label}
      className="docs-control min-w-0 overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-4 text-[13px] leading-relaxed dark:border-slate-800 dark:bg-slate-900 [&_pre]:bg-transparent"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
