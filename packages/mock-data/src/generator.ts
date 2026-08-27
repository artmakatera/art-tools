import type { GanttTask, TaskDependency, TaskDependencyType } from "@art-tools/react-gantt";

// ─────────────────────────────────────────────────────────────────────────────
// Mock data generator
//
// Produces up to N tasks shaped as a realistic tree:
//
//   project ──▶ phase (summary) ──▶ leaf task / milestone
//
// laid out left-to-right on a day-granular timeline. Every generated dependency
// is *valid*:
//   • it references two distinct, existing tasks,
//   • the graph is acyclic (links only ever point forward in time), and
//   • the dates respect the link semantics — an "FS" successor starts on/after
//     its predecessor's finish day, an "SS" pair shares a start day.
//
// Output is deterministic for a given (count, seed): the <Gantt> treats `tasks`
// as a stable seed, so a generator that returned fresh objects every render
// would fight the internal change log. Same inputs → identical arrays.
// ─────────────────────────────────────────────────────────────────────────────

export interface GenerateOptions {
  /** PRNG seed. Same seed + count → identical output. Defaults to 1. */
  seed?: number;
  /** First day of the timeline. Defaults to 2022-01-03 (a Monday). */
  startDate?: Date;
  /**
   * Inclusive calendar-year span the generated data should cover, e.g.
   * `[2020, 2025]`. When set, projects are scattered across the whole window
   * (Jan 1 of the first year → Dec 31 of the last) instead of running
   * single-file from `startDate`, and this takes precedence over `startDate`
   * for the timeline origin. Order-insensitive; a single year like `[2024,
   * 2024]` spans that one year. Each project keeps its own day-granular layout,
   * so a late-starting project may spill a little past the final year.
   */
  yearsRange?: [number, number];
  /**
   * Append one extra, deterministic chain of tasks guaranteed to sit on the
   * critical path (a diamond: one tight branch, one branch with slack),
   * dated after every other generated task so its own end becomes the
   * dataset's actual end — otherwise whether the critical path lands
   * somewhere interesting is up to luck, which makes it a poor demo of
   * `highlightCriticalPath`. Additive: does not count against `count`, and
   * unaffected by `count: 0`. Defaults to `false`.
   */
  addCriticalPathTask?: boolean;
}

export interface MockData {
  tasks: GanttTask[];
  dependencies: TaskDependency[];
}

const MS_PER_DAY = 86_400_000;
const MAX_DEPTH = 2; // project (0) → phase (1) → leaf (2)

// mulberry32 — a tiny, fast, deterministic PRNG. Math.random() is unavailable
// in some harness contexts and is non-deterministic anyway, so we roll our own.
function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

/**
 * Step the calendar day, matching the library's own `addDays`. Adding 24h chunks
 * drifts across DST (a fall-back day is 25 hours, so the result lands back
 * inside it), which would make generated data depend on the host timezone — and
 * this generator's whole contract is that a given (count, seed) is reproducible.
 */
function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d;
}

/** Whole calendar days between two dates, DST-independent. */
function daysBetween(from: Date, to: Date): number {
  const a = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const b = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((b - a) / MS_PER_DAY);
}

const PROJECT_NAMES = [
  "Launch Cloud Platform",
  "Mobile App Rollout",
  "Data Platform Migration",
  "Marketing Campaign",
  "Infrastructure Upgrade",
  "Customer Portal",
  "Payments Integration",
  "Analytics Overhaul",
  "Security Hardening",
  "Internationalization",
];

const PHASE_NAMES = [
  "Setup",
  "Design",
  "Development",
  "Testing",
  "Deployment",
  "Research",
  "Planning",
  "Review",
  "Integration",
  "Documentation",
  "QA Strategy",
  "Rollout",
];

const VERBS = [
  "Configure",
  "Install",
  "Write",
  "Review",
  "Deploy",
  "Test",
  "Design",
  "Build",
  "Migrate",
  "Audit",
  "Refactor",
  "Document",
  "Provision",
  "Optimize",
  "Validate",
  "Draft",
  "Integrate",
  "Monitor",
];

const OBJECTS = [
  "web server",
  "firewall",
  "load balancer",
  "API gateway",
  "database",
  "CI pipeline",
  "auth service",
  "dashboard",
  "mobile client",
  "cache layer",
  "search index",
  "email service",
  "payment flow",
  "onboarding",
  "landing page",
  "unit tests",
  "analytics",
  "CDN",
  "backup job",
  "feature flags",
];

const MILESTONE_NAMES = [
  "Sign-off",
  "Go-live",
  "Release approved",
  "Phase complete",
  "Stakeholder review",
  "Launch",
  "Beta ready",
  "Audit passed",
];

/**
 * Generate up to `count` tasks plus a set of valid dependencies between them.
 */
export function generateMockData(count: number, options: GenerateOptions = {}): MockData {
  const total = Math.max(0, Math.floor(count));
  const tasks: GanttTask[] = [];
  const dependencies: TaskDependency[] = [];
  if (total === 0 && !options.addCriticalPathTask) {
    return { tasks, dependencies };
  }

  const rng = makeRng(options.seed ?? 1);

  // When a years range is given it defines the timeline window and overrides
  // `startDate`; `spreadDays` (>0) then scatters project starts across it.
  let spreadDays = 0;
  let baseDate: Date;
  if (options.yearsRange) {
    const [a, b] = options.yearsRange;
    const firstYear = Math.min(a, b);
    const lastYear = Math.max(a, b);
    baseDate = new Date(firstYear, 0, 1);
    spreadDays = Math.max(0, daysBetween(baseDate, new Date(lastYear, 11, 31)));
  } else {
    // Local civil constructor, never an ISO string: `new Date("2022-01-03")`
    // parses as UTC midnight, which lands a day early west of Greenwich.
    baseDate = options.startDate ?? new Date(2022, 0, 3);
  }

  let nextId = 1;
  let nameSeq = 0;

  // Inclusive random integer in [min, max].
  const randInt = (min: number, max: number): number => min + Math.floor(rng() * (max - min + 1));

  const pick = <T>(arr: T[]): T => arr[Math.floor(rng() * arr.length)]!;

  const seen = new Set<string>();
  const addDep = (from: number, to: number, type: TaskDependencyType): void => {
    if (from === to) {
      return;
    }
    const key = `${from}->${to}`;
    const reverse = `${to}->${from}`;
    if (seen.has(key) || seen.has(reverse)) {
      return;
    }
    seen.add(key);
    dependencies.push({ from, to, type });
  };

  // Every leaf we lay down, in creation order, with its placed span. Used later
  // to sprinkle a few extra cross-task links that are still valid (forward in
  // time → acyclic).
  const leaves: Array<{ id: number; start: Date; end: Date }> = [];

  // Result of laying a contiguous group of children under one parent.
  interface Group {
    firstLeaf: number | null; // earliest leaf — the group's inbound anchor
    lastLeaf: number | null; //  latest leaf — the group's outbound anchor
    start: Date;
    end: Date;
    cursor: Date; // first free day after the whole group
    progressSum: number; // for averaging into the parent summary
    leafCount: number;
  }

  /**
   * Create exactly `n` task rows as descendants of `parentId`, laid out
   * sequentially from `startCursor`. Consecutive children are chained with an
   * FS link (occasionally SS for leaves that run in parallel), so the whole
   * group reads as a left-to-right waterfall.
   */
  function layChildren(
    parentId: number | null,
    n: number,
    startCursor: Date,
    depth: number,
  ): Group {
    let remaining = n;
    let cursor = startCursor;
    let groupEnd = startCursor;
    let firstLeaf: number | null = null;
    let lastLeaf: number | null = null;
    let progressSum = 0;
    let leafCount = 0;

    // Chaining state for the previous sibling at this level.
    let prevAnchor: number | null = null; // its lastLeaf
    let prevLeafStart: Date | null = null; // start of the previous leaf (for SS)

    while (remaining > 0) {
      const canSummary = depth < MAX_DEPTH && remaining >= 4 && rng() < 0.35;

      if (canSummary) {
        // A summary (phase) row plus its own descendants.
        const subSize = randInt(3, Math.min(remaining, 8));
        const summaryId = nextId++;
        const summary: GanttTask = {
          id: summaryId,
          name: `${pick(PHASE_NAMES)} ${++nameSeq}`,
          startDate: cursor,
          endDate: cursor,
          progress: 0,
          parentId,
          type: "summary",
        };
        tasks.push(summary);

        const sub = layChildren(summaryId, subSize - 1, cursor, depth + 1);
        summary.startDate = sub.start;
        summary.endDate = sub.end;
        summary.progress = sub.leafCount ? Math.round(sub.progressSum / sub.leafCount) : 0;

        if (prevAnchor !== null && sub.firstLeaf !== null) {
          addDep(prevAnchor, sub.firstLeaf, "FS");
        }
        if (firstLeaf === null) {
          firstLeaf = sub.firstLeaf;
        }
        if (sub.lastLeaf !== null) {
          lastLeaf = sub.lastLeaf;
          prevAnchor = sub.lastLeaf;
        }
        prevLeafStart = null; // a summary can't anchor an SS leaf link
        cursor = sub.cursor;
        groupEnd = sub.end > groupEnd ? sub.end : groupEnd;
        progressSum += sub.progressSum;
        leafCount += sub.leafCount;
        remaining -= subSize;
        continue;
      }

      // A leaf: a normal task, or — as the last child of a non-trivial group —
      // occasionally a zero-duration milestone.
      const isMilestone = remaining === 1 && prevAnchor !== null && rng() < 0.3;
      // Run in parallel with the previous leaf (shared start) ~25% of the time.
      const runParallel: boolean = !isMilestone && prevLeafStart !== null && rng() < 0.25;

      const start: Date = runParallel && prevLeafStart ? prevLeafStart : cursor;
      const duration = isMilestone ? 0 : randInt(1, 5);
      const end = isMilestone ? start : addDays(start, duration);
      const id = nextId++;

      const leaf: GanttTask = {
        id,
        name: isMilestone
          ? `${pick(MILESTONE_NAMES)} ${++nameSeq}`
          : `${pick(VERBS)} ${pick(OBJECTS)} ${++nameSeq}`,
        startDate: start,
        progress: isMilestone ? 100 : randInt(0, 100),
        parentId,
      };
      if (isMilestone) {
        leaf.type = "milestone";
      } else {
        leaf.endDate = end;
      }
      tasks.push(leaf);
      leaves.push({ id, start, end });

      if (prevAnchor !== null) {
        addDep(prevAnchor, id, runParallel ? "SS" : "FS");
      }
      if (firstLeaf === null) {
        firstLeaf = id;
      }
      lastLeaf = id;
      prevAnchor = id;
      prevLeafStart = start;

      // `end` is exclusive, so the next sibling starts exactly there (clean FS hand-off).
      const nextFree = end;
      if (nextFree > cursor) {
        cursor = nextFree;
      }
      groupEnd = end > groupEnd ? end : groupEnd;
      progressSum += leaf.progress ?? 0;
      leafCount += 1;
      remaining -= 1;
    }

    return {
      firstLeaf,
      lastLeaf,
      start: startCursor,
      end: groupEnd,
      cursor,
      progressSum,
      leafCount,
    };
  }

  // Top level: carve the budget into projects until it's spent.
  let remaining = total;
  let globalCursor = baseDate;

  while (remaining > 0) {
    const projectSize = Math.min(remaining, randInt(9, 28));
    remaining -= projectSize;

    // With a years range, each project starts on a random day inside the
    // window so the dataset spreads across the whole span; otherwise projects
    // stagger off the previous one via `globalCursor`.
    const projectStart = spreadDays > 0 ? addDays(baseDate, randInt(0, spreadDays)) : globalCursor;

    const projectId = nextId++;
    const project: GanttTask = {
      id: projectId,
      name: `${pick(PROJECT_NAMES)} ${nextId}`,
      startDate: projectStart,
      endDate: projectStart,
      progress: 0,
      type: "summary",
    };
    tasks.push(project);

    const body = layChildren(projectId, projectSize - 1, projectStart, 1);
    project.startDate = body.start;
    project.endDate = body.end;
    project.progress = body.leafCount ? Math.round(body.progressSum / body.leafCount) : 0;

    // Stagger the next project so the chart shows overlapping work rather than
    // one long single-file timeline.
    const span = Math.max(1, daysBetween(body.start, body.end));
    globalCursor = addDays(body.start, Math.max(3, Math.round(span * 0.4)));
  }

  // Sprinkle a few extra valid cross-task links: only ever from an earlier leaf
  // to a later one whose start is on/after the earlier's finish (keeps the graph
  // a DAG and the FS semantics honest).
  const ordered = leaves.toSorted((a, b) => a.start.getTime() - b.start.getTime());
  const extra = Math.floor(ordered.length * 0.08);
  for (let i = 0; i < extra; i++) {
    const fromIdx = randInt(0, ordered.length - 2);
    const toIdx = randInt(fromIdx + 1, ordered.length - 1);
    const from = ordered[fromIdx]!;
    const to = ordered[toIdx]!;
    if (to.start.getTime() >= from.end.getTime()) {
      addDep(from.id, to.id, "FS");
    }
  }

  if (options.addCriticalPathTask) {
    // Dated after everything else, so this chain's own end becomes the
    // dataset's actual end (ADR-023 in @art-tools/react-gantt: critical path
    // is computed against the chart's real current end, not a hypothetical
    // one) — that's what guarantees the tight branch below is critical
    // regardless of what the random generation above produced.
    const latestEnd = leaves.reduce((max, l) => (l.end > max ? l.end : max), baseDate);

    const summaryId = nextId++;
    const summary: GanttTask = {
      id: summaryId,
      name: "Critical Path Demo",
      startDate: latestEnd,
      endDate: latestEnd,
      progress: 0,
      type: "summary",
    };
    tasks.push(summary);

    const aStart = latestEnd;
    const aEnd = addDays(aStart, 3);
    const aId = nextId++;
    const aProgress = randInt(0, 100);
    tasks.push({
      id: aId,
      name: "Kick off critical path demo",
      startDate: aStart,
      endDate: aEnd,
      progress: aProgress,
      parentId: summaryId,
    });

    // Tight branch: starts exactly where A finishes, no slack. A, B and the
    // A→B edge are all critical.
    const bStart = aEnd;
    const bEnd = addDays(bStart, 4);
    const bId = nextId++;
    const bProgress = randInt(0, 100);
    tasks.push({
      id: bId,
      name: "Critical path — tight branch",
      startDate: bStart,
      endDate: bEnd,
      progress: bProgress,
      parentId: summaryId,
    });
    addDep(aId, bId, "FS");

    // Slack branch: also starts where A finishes, but is short — it finishes
    // long before C actually needs it, so it is NOT on the critical path even
    // though it feeds C directly.
    const dStart = aEnd;
    const dEnd = addDays(dStart, 1);
    const dId = nextId++;
    const dProgress = randInt(0, 100);
    tasks.push({
      id: dId,
      name: "Critical path — slack branch",
      startDate: dStart,
      endDate: dEnd,
      progress: dProgress,
      parentId: summaryId,
    });
    addDep(aId, dId, "FS");

    // C waits on both B and D, but only B's finish actually pins its start —
    // the A→B, B→C edges are critical; A→D and D→C are not.
    const cStart = bEnd;
    const cEnd = addDays(cStart, 3);
    const cId = nextId++;
    const cProgress = 0;
    tasks.push({
      id: cId,
      name: "Ship critical path demo",
      startDate: cStart,
      endDate: cEnd,
      progress: cProgress,
      parentId: summaryId,
    });
    addDep(bId, cId, "FS");
    addDep(dId, cId, "FS");

    summary.startDate = aStart;
    summary.endDate = cEnd;
    summary.progress = Math.round((aProgress + bProgress + dProgress + cProgress) / 4);
  }

  return { tasks, dependencies };
}
