/**
 * Lazily-constructed, cached date formatters.
 *
 * `date.toLocaleString(undefined, options)` builds a fresh `Intl.DateTimeFormat`
 * on every call, and that construction — not the formatting — is what costs.
 * The calendar header calls it twice per visible cell (label + `aria-label`) and
 * bar labels call it up to twice per bar, so a chart re-render was spending most
 * of its time re-deriving formatters it had already built. Reusing one instance
 * produces byte-identical output for a fraction of the cost.
 *
 * Construction is deferred to first use so importing the library does no Intl
 * work, and so the formatter resolves the host's default locale at render time
 * rather than at module-eval time. A locale switched *after* the first format
 * call is not picked up — acceptable, since the locale is a host setting rather
 * than something the chart re-reads.
 */
export function dateFormatter(
  options: Intl.DateTimeFormatOptions,
): (date: Date) => string {
  let formatter: Intl.DateTimeFormat | undefined;
  return (date) => {
    formatter ??= new Intl.DateTimeFormat(undefined, options);
    return formatter.format(date);
  };
}
