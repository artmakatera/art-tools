import { Fragment, useEffect, useState } from "react";
import { useDependencyLinks } from "./DependencyLinksContext";
import { midpoint, type Point } from "./geometry";
import type { TaskDependency } from "../../types";
import styles from "./DependencyLinks.module.css";

/** Stroke thickness of the link, in pixels. */
const THICKNESS = 2;
/** Side length of the arrowhead, in pixels. */
const ARROW = 8;
/** Transparent hit-area padding around each segment, in pixels. */
const HIT_PADDING = 6;

interface DependencyLinksProps {
  width: number;
  height: number;
  onDependencyDelete?: (dep: TaskDependency) => void;
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

export function DependencyLinks({ width, height, onDependencyDelete }: DependencyLinksProps) {
  const links = useDependencyLinks();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deletePos, setDeletePos] = useState<{ x: number; y: number } | null>(null);

  const selectedLink = selectedId ? links.find((l) => l.id === selectedId) : null;

  useEffect(() => {
    if (!selectedId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedLink) onDependencyDelete?.(selectedLink.dep);
        setSelectedId(null);
        setDeletePos(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, selectedLink, onDependencyDelete]);

  if (links.length === 0) return null;

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
    if (selectedLink) onDependencyDelete?.(selectedLink.dep);
    setSelectedId(null);
    setDeletePos(null);
  };

  return (
    <div
      className={styles.layer}
      style={{ width, height }}
      aria-hidden
      onClick={() => { setSelectedId(null); setDeletePos(null); }}
    >
      {links.map((link) => {
        const head = arrow(link.points);
        const isSelected = link.id === selectedId;
        const segs = segments(link.points);
        const mid = link.dep.lag ? midpoint(link.points) : null;

        return (
          <Fragment key={link.id}>
            {/* Transparent hit-area divs to capture clicks */}
            {segs.map(([a, b]) => (
              <div
                key={`hit-${a.x},${a.y}-${b.x},${b.y}`}
                className={styles.hitArea}
                style={hitAreaStyle(a, b)}
                onClick={(e) => handleLinkClick(link.id, e)}
              />
            ))}
            {/* Visible segments */}
            {segs.map(([a, b]) => (
              <div
                key={`seg-${a.x},${a.y}-${b.x},${b.y}`}
                className={`${styles.segment} ${isSelected ? styles.segmentSelected : ""}`}
                style={segmentStyle(a, b)}
              />
            ))}
            <div className={`${head.className} ${isSelected ? styles.arrowSelected : ""}`} style={head.style} />

            {/* Lag label */}
            {mid && link.dep.lag !== undefined && link.dep.lag !== 0 && (
              <div
                className={styles.lagLabel}
                style={{ left: mid.x, top: mid.y }}
              >
                {link.dep.lag > 0 ? `+${link.dep.lag}d` : `${link.dep.lag}d`}
              </div>
            )}
          </Fragment>
        );
      })}

      {/* Delete button */}
      {selectedLink && deletePos && (
        <button
          className={styles.deleteBtn}
          style={{ left: deletePos.x, top: deletePos.y }}
          onClick={handleDelete}
          aria-label="Delete dependency"
        >
          ×
        </button>
      )}
    </div>
  );
}
