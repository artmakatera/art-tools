import { clsx } from "clsx";
import { Fragment, useEffect, useState, type ComponentProps, type ElementType } from "react";
import { useDependencyLinks } from "./DependencyLinksContext";
import { midpoint, type Bounds, type DependencyLink, type Point } from "./geometry";
import type { TaskDependency } from "../../types";
import { mergeSlotProps, type SlotConfig, type SlotPropsInput } from "../../core/slots";
import { useGanttSlots } from "../../context/GanttSlotsContext";
import { useGanttCriticalPath, useGanttLabels, useGanttReadOnly } from "../../context/contexts";
import styles from "./DependencyLinks.module.css";

/** Stroke thickness of the link, in pixels. */
const THICKNESS = 2;
/** Side length of the arrowhead, in pixels. */
const ARROW = 8;
/** Transparent hit-area padding around each segment, in pixels. */
const HIT_PADDING = 6;

/** State passed to the function form of the `layer` slotProps. */
export interface DependencyLinksLayerOwnerState {
  width: number;
  height: number;
  /** Number of dependency links currently in the layer. */
  linkCount: number;
}

/** State shared by the per-link slots (`arrow`). */
export interface DependencyLinkOwnerState {
  /** The dependency link being rendered. */
  link: DependencyLink;
  /** Whether this link is currently selected. */
  isSelected: boolean;
  /** Whether this link is the binding edge of the critical path (ADR-023). */
  isCritical: boolean;
}

/** State passed to the `segment` slotProps, per visible segment of a link. */
export interface DependencySegmentOwnerState extends DependencyLinkOwnerState {
  /** Start point of this segment. */
  from: Point;
  /** End point of this segment. */
  to: Point;
  /** Index of this segment within the link's polyline. */
  index: number;
}

/** State passed to the `lagLabel` slotProps. */
export interface DependencyLagLabelOwnerState extends DependencyLinkOwnerState {
  /** The lag value in days (non-zero when the label renders). */
  lag: number;
}

/** State passed to the `deleteButton` slotProps. */
export interface DependencyDeleteButtonOwnerState {
  /** The dependency the button will delete when clicked. */
  dependency: TaskDependency;
}

export interface DependencyLinksSlots {
  /** The absolutely-positioned links layer container. Default: `"div"`. */
  layer?: ElementType;
  /** A single visible link segment. Default: `"div"`. */
  segment?: ElementType;
  /** The arrowhead at the target end of a link. Default: `"div"`. */
  arrow?: ElementType;
  /** The `+Nd` / `-Nd` lag label. Default: `"div"`. */
  lagLabel?: ElementType;
  /** The `×` delete button shown for the selected link. Default: `"button"`. */
  deleteButton?: ElementType;
}

export interface DependencyLinksSlotProps {
  layer?: SlotPropsInput<ComponentProps<"div">, DependencyLinksLayerOwnerState>;
  segment?: SlotPropsInput<ComponentProps<"div">, DependencySegmentOwnerState>;
  arrow?: SlotPropsInput<ComponentProps<"div">, DependencyLinkOwnerState>;
  lagLabel?: SlotPropsInput<ComponentProps<"div">, DependencyLagLabelOwnerState>;
  deleteButton?: SlotPropsInput<ComponentProps<"button">, DependencyDeleteButtonOwnerState>;
}

/** Slot config for the dependency links layer. */
export type DependencyLinksSlotConfig = SlotConfig<DependencyLinksSlots, DependencyLinksSlotProps>;

interface DependencyLinksProps {
  width: number;
  height: number;
  onDependencyDelete?: (dep: TaskDependency) => void;
  /** Overscan-padded visible pixel rect; links outside it are not rendered. */
  visibleRect?: Bounds;
  slots?: DependencyLinksSlots;
  slotProps?: DependencyLinksSlotProps;
}

/** True when a link's bounding box overlaps the visible rect (or no rect set). */
function linkInView(b: Bounds, rect: Bounds | undefined): boolean {
  if (!rect) {
    return true;
  }
  return b.minX <= rect.maxX && b.maxX >= rect.minX && b.minY <= rect.maxY && b.maxY >= rect.minY;
}

/** One straight segment as an absolutely-positioned box. */
function segmentStyle(a: Point, b: Point): React.CSSProperties {
  if (a.y === b.y) {
    return {
      left: Math.min(a.x, b.x) - THICKNESS / 2,
      top: a.y - THICKNESS / 2,
      width: Math.abs(b.x - a.x) + THICKNESS,
      height: THICKNESS,
    };
  }
  return {
    left: a.x - THICKNESS / 2,
    top: Math.min(a.y, b.y) - THICKNESS / 2,
    width: THICKNESS,
    height: Math.abs(b.y - a.y) + THICKNESS,
  };
}

/** Wider transparent hit-area div for the same segment. */
function hitAreaStyle(a: Point, b: Point): React.CSSProperties {
  if (a.y === b.y) {
    return {
      left: Math.min(a.x, b.x) - THICKNESS / 2,
      top: a.y - HIT_PADDING,
      width: Math.abs(b.x - a.x) + THICKNESS,
      height: THICKNESS + HIT_PADDING * 2,
    };
  }
  return {
    left: a.x - HIT_PADDING,
    top: Math.min(a.y, b.y) - THICKNESS / 2,
    width: THICKNESS + HIT_PADDING * 2,
    height: Math.abs(b.y - a.y) + THICKNESS,
  };
}

function segments(points: Point[]): Array<[Point, Point]> {
  const pairs: Array<[Point, Point]> = [];
  for (let i = 0; i + 1 < points.length; i++) {
    pairs.push([points[i]!, points[i + 1]!]);
  }
  return pairs;
}

function arrow(points: Point[]) {
  const tip = points[points.length - 1]!;
  const prev = points[points.length - 2]!;
  const pointsRight = tip.x >= prev.x;
  return {
    className: pointsRight ? styles.arrowRight : styles.arrowLeft,
    style: {
      left: pointsRight ? tip.x - ARROW : tip.x,
      top: tip.y - ARROW / 2,
    } as React.CSSProperties,
  };
}

export function DependencyLinks({
  width,
  height,
  onDependencyDelete,
  visibleRect,
  slots: slotsProp,
  slotProps: slotPropsProp,
}: DependencyLinksProps) {
  const ganttSlots = useGanttSlots();
  const slots = slotsProp ?? ganttSlots.dependencies?.links?.slots;
  const slotProps = slotPropsProp ?? ganttSlots.dependencies?.links?.slotProps;
  const labels = useGanttLabels();
  // A read-only chart drops the hit areas, so no link can become selected —
  // which is also what keeps the Delete/Backspace shortcut below unreachable.
  const readOnly = useGanttReadOnly();
  const criticalPath = useGanttCriticalPath();

  const links = useDependencyLinks();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deletePos, setDeletePos] = useState<{ x: number; y: number } | null>(null);

  const selectedLink = selectedId ? links.find((l) => l.id === selectedId) : null;

  useEffect(() => {
    if (!selectedId) {
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedLink) {
          onDependencyDelete?.(selectedLink.dep);
        }
        setSelectedId(null);
        setDeletePos(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, selectedLink, onDependencyDelete]);

  if (links.length === 0) {
    return null;
  }

  const handleLinkClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedId === id) {
      setSelectedId(null);
      setDeletePos(null);
    } else {
      setSelectedId(id);
      const layer = (e.currentTarget as HTMLElement).closest(`.${styles.layer}`);
      const rect = layer?.getBoundingClientRect();
      setDeletePos(rect ? { x: e.clientX - rect.left, y: e.clientY - rect.top } : null);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedLink) {
      onDependencyDelete?.(selectedLink.dep);
    }
    setSelectedId(null);
    setDeletePos(null);
  };

  const Layer = slots?.layer ?? "div";
  const Segment = slots?.segment ?? "div";
  const Arrow = slots?.arrow ?? "div";
  const LagLabel = slots?.lagLabel ?? "div";
  const DeleteButton = slots?.deleteButton ?? "button";
  const layerProps = mergeSlotProps(
    {
      className: styles.layer,
      style: { width, height },
      role: "presentation",
      "aria-hidden": true,
      onClick: () => {
        setSelectedId(null);
        setDeletePos(null);
      },
    },
    slotProps?.layer,
    { width, height, linkCount: links.length },
  );

  return (
    <Layer {...layerProps}>
      {links.map((link) => {
        const isSelected = link.id === selectedId;
        if (!isSelected && !linkInView(link.bounds, visibleRect)) {
          return null;
        }
        const head = arrow(link.points);
        const segs = segments(link.points);
        const mid = link.dep.lag ? midpoint(link.points) : null;
        const isCritical = criticalPath?.criticalDependencyKeys.has(link.id) ?? false;
        const linkOwnerState: DependencyLinkOwnerState = { link, isSelected, isCritical };

        const arrowProps = mergeSlotProps(
          {
            className: clsx(
              head.className,
              isSelected && styles.arrowSelected,
              isCritical && styles.arrowCritical,
            ),
            style: head.style,
          },
          slotProps?.arrow,
          linkOwnerState,
        );

        return (
          <Fragment key={link.id}>
            {/* Transparent hit-area divs to capture clicks */}
            {!readOnly &&
              segs.map(([a, b]) => (
                <div
                  key={`hit-${a.x},${a.y}-${b.x},${b.y}`}
                  className={styles.hitArea}
                  style={hitAreaStyle(a, b)}
                  onClick={(e) => handleLinkClick(link.id, e)}
                />
              ))}
            {/* Visible segments */}
            {segs.map(([a, b], index) => {
              const segmentProps = mergeSlotProps(
                {
                  className: clsx(
                    styles.segment,
                    isSelected && styles.segmentSelected,
                    isCritical && styles.segmentCritical,
                  ),
                  style: segmentStyle(a, b),
                },
                slotProps?.segment,
                { link, isSelected, isCritical, from: a, to: b, index },
              );
              return <Segment key={`seg-${a.x},${a.y}-${b.x},${b.y}`} {...segmentProps} />;
            })}
            <Arrow {...arrowProps} />

            {/* Lag label */}
            {mid && link.dep.lag !== undefined && link.dep.lag !== 0 && (
              <LagLabel
                {...mergeSlotProps(
                  {
                    className: styles.lagLabel,
                    style: { left: mid.x, top: mid.y },
                    children: link.dep.lag > 0 ? `+${link.dep.lag}d` : `${link.dep.lag}d`,
                  },
                  slotProps?.lagLabel,
                  { link, isSelected, isCritical, lag: link.dep.lag },
                )}
              />
            )}
          </Fragment>
        );
      })}

      {!readOnly && selectedLink && deletePos && (
        <DeleteButton
          {...mergeSlotProps(
            {
              className: styles.deleteBtn,
              type: "button",
              tabIndex: -1,
              style: { left: deletePos.x, top: deletePos.y },
              onClick: handleDelete,
              "aria-label": labels.deleteDependency,
              children: "×",
            },
            slotProps?.deleteButton,
            { dependency: selectedLink.dep },
          )}
        />
      )}
    </Layer>
  );
}
