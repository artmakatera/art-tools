import type { Id, TaskDependency } from "../types";
import { buildDependencyGraph } from "./scheduling";

export type LinkVerdict = "ok" | "self" | "duplicate" | "cycle";

/**
 * Whether a `from → to` dependency may be created.
 *
 * `endDrag` historically checked only that the two tasks differ, so a cycle or a
 * duplicate could be created silently. A cycle then makes `scheduleDependents`
 * hit its `maxIterations` guard and settle on arbitrary dates. Pointer drags
 * make cycles fiddly to author; keyboard linking makes them two keystrokes away,
 * so validating is no longer optional.
 *
 * Takes the plain dependency array rather than a prebuilt graph so it can be
 * called from anywhere that has the `dependencies` prop.
 */
export function canLink(
  dependencies: TaskDependency[],
  from: Id,
  to: Id,
): LinkVerdict {
  if (from === to) {
    return "self";
  }
  if (dependencies.some((dep) => dep.from === from && dep.to === to)) {
    return "duplicate";
  }

  // A cycle would exist iff `from` is already reachable downstream of `to`.
  const { successorsOf } = buildDependencyGraph(dependencies);
  const seen = new Set<Id>([to]);
  const queue: Id[] = [to];
  while (queue.length > 0) {
    const current = queue.pop()!;
    for (const next of successorsOf.get(current) ?? []) {
      if (next === from) {
        return "cycle";
      }
      if (!seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }

  return "ok";
}
