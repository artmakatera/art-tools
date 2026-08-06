import type { ComponentProps, ElementType } from "react";
import { useGanttDependencyDrag } from "../../context/GanttContext";
import type { DependencyDragState } from "../../hooks/useDependencyDrag";
import { mergeSlotProps, type SlotConfig, type SlotPropsInput } from "../../core/slots";
import { useGanttSlots } from "../../context/GanttSlotsContext";
import styles from "./DependencyPreview.module.css";

/** State passed to the function form of the `root` slotProps. */
export interface DependencyPreviewOwnerState {
  /** The in-progress dependency drag. */
  drag: DependencyDragState;
  /** Horizontal length of the rubber-band, in pixels. */
  length: number;
  /** Rotation of the rubber-band, in degrees. */
  angle: number;
}

export interface DependencyPreviewSlots {
  /** The rubber-band preview line. Default: `"div"`. */
  root?: ElementType;
}

export interface DependencyPreviewSlotProps {
  root?: SlotPropsInput<ComponentProps<"div">, DependencyPreviewOwnerState>;
}

/** Slot config for the dependency drag preview. */
export type DependencyPreviewSlotConfig = SlotConfig<
  DependencyPreviewSlots,
  DependencyPreviewSlotProps
>;

interface DependencyPreviewProps {
  slots?: DependencyPreviewSlots;
  slotProps?: DependencyPreviewSlotProps;
}

export function DependencyPreview({
  slots: slotsProp,
  slotProps: slotPropsProp,
}: DependencyPreviewProps) {
  const ganttSlots = useGanttSlots();
  const slots = slotsProp ?? ganttSlots.dependencies?.preview?.slots;
  const slotProps = slotPropsProp ?? ganttSlots.dependencies?.preview?.slotProps;

  const drag = useGanttDependencyDrag();
  if (!drag) {
    return null;
  }

  const dx = drag.currentX - drag.startX;
  const dy = drag.currentY - drag.startY;
  const length = Math.hypot(dx, dy);
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);

  const Root = slots?.root ?? "div";
  // The positional transform stays as the internal default style so a consumer's
  // `style` merges on top of it rather than replacing the rubber-band geometry.
  const rootProps = mergeSlotProps(
    {
      className: styles.preview,
      // Transient drag affordance; progress is announced via the live region.
      "aria-hidden": true,
      style: {
        left: drag.startX,
        top: drag.startY,
        width: length,
        transform: `rotate(${angle}deg)`,
      },
    },
    slotProps?.root,
    { drag, length, angle },
  );

  return <Root {...rootProps} />;
}
