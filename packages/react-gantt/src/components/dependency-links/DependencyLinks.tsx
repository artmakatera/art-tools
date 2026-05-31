import { Fragment } from "react";
import { useDependencyLinks } from "./DependencyLinksContext";
import type { Point } from "./geometry";
import styles from "./DependencyLinks.module.css";

/** Stroke thickness of the link, in pixels. */
const THICKNESS = 2;
/** Side length of the arrowhead, in pixels. */
const ARROW = 8;

interface DependencyLinksProps {
  width: number;
  height: number;
}

/** One straight segment of the elbow, as an absolutely-positioned box. */
function segmentStyle(a: Point, b: Point): React.CSSProperties {
  if (a.y === b.y) {
    // Horizontal: extend by THICKNESS so corners meet cleanly.
    return {
      left: Math.min(a.x, b.x) - THICKNESS / 2,
      top: a.y - THICKNESS / 2,
      width: Math.abs(b.x - a.x) + THICKNESS,
      height: THICKNESS,
    };
  }
  // Vertical.
  return {
    left: a.x - THICKNESS / 2,
    top: Math.min(a.y, b.y) - THICKNESS / 2,
    width: THICKNESS,
    height: Math.abs(b.y - a.y) + THICKNESS,
  };
}

/** Adjacent point pairs that make up the elbow's straight segments. */
function segments(points: Point[]): Array<[Point, Point]> {
  const pairs: Array<[Point, Point]> = [];
  for (let i = 0; i + 1 < points.length; i++) {
    pairs.push([points[i]!, points[i + 1]!]);
  }
  return pairs;
}

/** Arrowhead at the final point, oriented by the last (horizontal) segment. */
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

/**
 * HTML overlay that draws the dependency links read from context. It sits above
 * the bars but ignores pointer events so dragging/resizing stays unaffected.
 */
export function DependencyLinks({ width, height }: DependencyLinksProps) {
  const links = useDependencyLinks();
  if (links.length === 0) return null;

  return (
    <div className={styles.layer} style={{ width, height }} aria-hidden>
      {links.map((link) => {
        const head = arrow(link.points);
        return (
          <Fragment key={link.id}>
            {segments(link.points).map(([a, b]) => (
              <div
                key={`${a.x},${a.y}-${b.x},${b.y}`}
                className={styles.segment}
                style={segmentStyle(a, b)}
              />
            ))}
            <div className={head.className} style={head.style} />
          </Fragment>
        );
      })}
    </div>
  );
}
