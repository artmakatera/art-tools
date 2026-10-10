export function ChartPlaceholder({ height }: { height: number }) {
  return (
    <div
      role="status"
      aria-label="Loading chart"
      style={{ height }}
      className="overflow-hidden bg-white dark:bg-slate-900"
    >
      <span className="sr-only">Loading chart…</span>
      <div aria-hidden="true" className="flex h-full flex-col">
        <div className="flex h-12 shrink-0 items-center gap-3 border-b border-slate-200 bg-slate-50 px-4 dark:border-slate-800 dark:bg-slate-950">
          <div className="h-3 w-24 rounded bg-slate-200 dark:bg-slate-800" />
          <div className="ml-auto h-3 w-16 rounded bg-slate-200 dark:bg-slate-800" />
        </div>
        {["w-1/3", "w-1/2", "w-1/4", "w-2/5"].map((width) => (
          <div
            key={width}
            className="flex h-12 shrink-0 border-b border-slate-100 dark:border-slate-800"
          >
            <div className="flex w-1/3 max-w-48 shrink-0 items-center border-r border-slate-200 px-4 dark:border-slate-800">
              <div className="h-2 w-16 rounded bg-slate-100 dark:bg-slate-800" />
            </div>
            <div className="flex flex-1 items-center px-4">
              <div className={width}>
                <div className="h-4 rounded bg-slate-200 dark:bg-slate-800" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
