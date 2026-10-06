import { describe, expect, expectTypeOf, it } from "vitest";
import * as api from "../index";
import type { BaselineTooltipProps, GanttBaseline, GanttProps, GanttProviderProps } from "../index";

/**
 * The package's runtime export surface, pinned.
 *
 * It had drifted into several asymmetries — `Calendar` exported without the type
 * of a required prop, `GanttProvider` without its props type, one of thirteen
 * context hooks exported, the dependency-link ownerStates exported from their
 * module but not from here. Each was invisible until someone tried to use the
 * thing. A snapshot makes the next omission a failing test instead.
 *
 * Types cannot be asserted at runtime, so this covers values only; `pnpm build`
 * plus a read of `dist/index.d.ts` remains the check for the type surface.
 */

describe("public API", () => {
  it("exposes timeline elements on both chart entry points", () => {
    expectTypeOf<api.GanttTimelineElement["key"]>().toEqualTypeOf<import("react").Key>();
    expectTypeOf<GanttProviderProps["timelineElements"]>().toEqualTypeOf<
      GanttProps["timelineElements"]
    >();
    expectTypeOf<api.GanttTimelineElement["render"]>().toEqualTypeOf<
      (context: api.TimelineElementRenderProps) => import("react").ReactNode
    >();
    expectTypeOf<api.MarkerProps["date"]>().toEqualTypeOf<api.TimelineElementRenderProps["date"]>();
    expectTypeOf<api.TimelineElementRenderProps["date"]>().toEqualTypeOf<Date>();
    expectTypeOf<api.MarkerProps["formatDate"]>().toEqualTypeOf<
      ((date: Date) => string) | undefined
    >();
  });
  it("exports baseline data and tooltip types", () => {
    expectTypeOf<GanttBaseline["id"]>().toEqualTypeOf<string | number>();
    expectTypeOf<BaselineTooltipProps["baseline"]>().toEqualTypeOf<GanttBaseline>();
  });
  it("exposes the baseline visibility flag on both chart entry points", () => {
    expectTypeOf<GanttProps["rowHeight"]>().toEqualTypeOf<number | undefined>();
    expectTypeOf<GanttProviderProps["rowHeight"]>().toEqualTypeOf<number | undefined>();
    expectTypeOf<GanttProps["baselineLayout"]>().toEqualTypeOf<
      { height?: number; padding?: number; gap?: number } | undefined
    >();
    expectTypeOf<GanttProviderProps["baselineLayout"]>().toEqualTypeOf<
      GanttProps["baselineLayout"]
    >();
    expectTypeOf<GanttProps["showBaselines"]>().toEqualTypeOf<boolean | undefined>();
    expectTypeOf<GanttProviderProps["showBaselines"]>().toEqualTypeOf<boolean | undefined>();
  });
  it("exports exactly this set of values", () => {
    expect(Object.keys(api).toSorted()).toEqual([
      "ACTION_COLUMN_KEY",
      "BarTooltipRoot",
      "BarTooltipTrigger",
      "Calendar",
      "DEFAULT_COLUMNS",
      "DEFAULT_ZOOM_INDEX",
      "DEFAULT_ZOOM_LEVELS",
      "Gantt",
      "GanttBarTooltip",
      "GanttGrid",
      "GanttProvider",
      "GanttSlotsProvider",
      "Marker",
      "MilestoneBar",
      "ProjectBar",
      "READ_ONLY_COLUMNS",
      "TaskBar",
      "TaskList",
      "displayEndDate",
      "endInstantFromDisplayDate",
      "mergeSlotProps",
      "useBarTooltip",
      "useGanttReadOnly",
      "useGanttSlots",
    ]);
  });

  it("keeps the built-in column sets consistent with each other", () => {
    // READ_ONLY_COLUMNS is DEFAULT_COLUMNS minus the actions column, and
    // ACTION_COLUMN_KEY is what identifies it — the three only make sense together.
    expect(api.DEFAULT_COLUMNS.map((c) => c.key)).toContain(api.ACTION_COLUMN_KEY);
    expect(api.READ_ONLY_COLUMNS.map((c) => c.key)).not.toContain(api.ACTION_COLUMN_KEY);
    expect(api.READ_ONLY_COLUMNS).toHaveLength(api.DEFAULT_COLUMNS.length - 1);
  });
});
