export const DEFAULT_COL_WIDTH = 40;
export const DEFAULT_ROW_HEIGHT = 36;
export const DEFAULT_PAD_DAYS = 1;
export const TASK_VERTICAL_PADDING = 6;

/** Diameter of a connector handle in px (must match `.handle` size in ConnectorHandles.module.css). */
export const CONNECTOR_HANDLE_SIZE = 10;

/** Width of a drag-resize divider in px. */
export const DIVIDER_WIDTH = 4;

/** Minimum visible width of the grid overlay in px. */
export const GRID_MIN_WIDTH = 10;

/** Minimum width of a task-list column when drag-resizing, in px. */
export const COLUMN_MIN_WIDTH = 60;

/**
 * Max items rendered per axis while the viewport is still unmeasured (first
 * commit, before `useLayoutEffect` reports real metrics; also jsdom, where
 * client sizes are always 0). Enough to fill any realistic screen, but a hard
 * bound so mounting a 10k-task dataset never renders 10k rows unwindowed.
 */
export const UNMEASURED_FALLBACK_COUNT = 100;

/** Extra task rows rendered above/below the viewport so fast vertical scrolls stay covered. */
export const ROW_OVERSCAN = 6;

/** Extra date columns rendered left/right of the viewport so fast horizontal scrolls stay covered. */
export const COL_OVERSCAN = 4;
