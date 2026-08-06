/** Default rows per PageUp/PageDown when the viewport hasn't been measured. */
export const PAGE_ROWS_FALLBACK = 10;

const EDITABLE_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

/**
 * Whether a keystroke aimed at `target` belongs to a text entry rather than to
 * the Gantt's keyboard model.
 *
 * Columns are rendered by the consumer (`ColumnDef.render`), so an inline editor
 * can sit inside any cell. Without this guard, arrow keys would move the row
 * cursor while the user is editing text, and `-` would zoom the grid out.
 */
export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  if (EDITABLE_TAGS.has(target.tagName) || target.isContentEditable) {
    return true;
  }
  const role = target.getAttribute("role");
  return role === "textbox" || role === "searchbox" || role === "combobox";
}

/**
 * Rows to travel per PageUp/PageDown: one viewport minus a row of overlap, so
 * the user keeps a visual anchor between pages.
 */
export function pageRowsFor(clientHeight: number, rowHeight: number): number {
  if (clientHeight <= 0 || rowHeight <= 0) {
    return PAGE_ROWS_FALLBACK;
  }
  return Math.max(1, Math.floor(clientHeight / rowHeight) - 1);
}
