import { CONNECTOR_HANDLE_SIZE } from "../../../core/constants";
import type { ConnectorHandle } from "../../../hooks/useDependencyDrag";

export interface Point {
  x: number;
  y: number;
}

const HALF = CONNECTOR_HANDLE_SIZE / 2;

/**
 * Centre of a task's connector handle, in grid-body coordinates.
 *
 * Mirrors the placement in `ConnectorHandles`: the start handle's box sits at
 * `barLeft - CONNECTOR_HANDLE_SIZE` and the end handle's at `barLeft + barWidth`,
 * both vertically centred on the bar. That centre is always the row's midline —
 * `TASK_VERTICAL_PADDING + (rowHeight - 2 * TASK_VERTICAL_PADDING) / 2`
 * reduces to `rowHeight / 2` — so the row index is all the vertical information
 * needed.
 *
 * Computed rather than measured so the keyboard link preview works even when the
 * target row is outside the virtualization window and has no DOM node.
 */
export function connectorAnchor(
  handle: ConnectorHandle,
  barLeft: number,
  barWidth: number,
  rowIndex: number,
  rowHeight: number,
): Point {
  return {
    x: handle === "start" ? barLeft - HALF : barLeft + barWidth + HALF,
    y: rowIndex * rowHeight + rowHeight / 2,
  };
}
