import { useContext, useMemo } from "react";
import { clsx } from "clsx";
import { dateAtOffset } from "../../core/dateUtils";
import { useTimelinePointer } from "../../hooks/useTimelinePointer";
import { TimelineElementsContext } from "../../context/TimelineElementsContext";
import { useGanttViewport } from "../../context/contexts";
import {
  validTimelineElements,
  timelineElementX,
  isTimelineElementVisible,
} from "../../core/timelineElements";
import type { CalendarUnit, GanttTimelineElement, TimelineElementRenderProps } from "../../types";
import styles from "./TimelineElements.module.css";

interface TimelineElementsProps {
  origin: Date;
  unit: CalendarUnit;
  step: number;
  colWidth: number;
  totalWidth: number;
  bodyHeight: number;
  headerHeight: number;
}

export function TimelineElements(props: TimelineElementsProps) {
  const elements = useContext(TimelineElementsContext);
  const valid = useMemo(() => validTimelineElements(elements), [elements]);
  if (valid.length === 0) {
    return null;
  }
  return <TimelineElementsLayer {...props} elements={valid} />;
}

function TimelineElementsLayer({
  origin,
  unit,
  step,
  colWidth,
  totalWidth,
  bodyHeight,
  headerHeight,
  elements,
}: TimelineElementsProps & { elements: readonly GanttTimelineElement[] }) {
  const viewport = useGanttViewport();
  const pointerX = useTimelinePointer(
    elements.some((element) => element.date === "pointer"),
    headerHeight,
    totalWidth,
  );
  // The calendar occupies its original layout height even while sticky. Advancing
  // the label by scrollTop keeps it immediately below that calendar (ADR-026).
  const visibleTop = Math.min(bodyHeight, Math.max(0, viewport.scrollTop));
  const visibleHeight = Math.max(
    0,
    Math.min(bodyHeight - visibleTop, viewport.clientHeight - headerHeight),
  );
  return (
    <div className={styles.layer}>
      {elements.map((element) => {
        const followsPointer = element.date === "pointer";
        if (followsPointer && pointerX === null) {
          return null;
        }
        const x =
          element.date === "pointer"
            ? pointerX!
            : timelineElementX(element.date, origin, unit, step, colWidth);
        const date =
          element.date === "pointer"
            ? dateAtOffset(origin, unit, (x / colWidth) * step)
            : element.date;
        if (
          !isTimelineElementVisible(
            x,
            totalWidth,
            viewport.scrollLeft,
            viewport.clientWidth,
            element.overscanPx,
          )
        ) {
          return null;
        }
        const props: TimelineElementRenderProps = {
          date,
          title: element.title,
          x,
          bodyHeight,
          visibleTop,
          visibleHeight,
        };
        return (
          <div
            className={clsx(styles.element, followsPointer && styles.pointerElement)}
            key={element.key}
            style={{ left: x }}
          >
            {element.render(props)}
          </div>
        );
      })}
    </div>
  );
}
