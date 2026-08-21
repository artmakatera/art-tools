"use client";

import type { ComponentProps } from "react";
import { Gantt, type GanttBarsSlots, type GanttTaskListSlots } from "@art-tools/react-gantt";
import { treeTasks } from "@/lib/demo-tasks";

/** A replacement for the default ▸/▾ expander. */
function RoundToggle(props: ComponentProps<"button">) {
  return (
    <button
      {...props}
      style={{
        width: 18,
        height: 18,
        marginRight: 6,
        borderRadius: "50%",
        border: "1px solid #94a3b8",
        background: "#fff",
        color: "#475569",
        fontSize: 11,
        lineHeight: 1,
        cursor: "pointer",
      }}
    />
  );
}

/**
 * Slot configs MUST be referentially stable — rows are memoized, so a fresh
 * object each render would re-render every row. Hoist them to module scope (or
 * useMemo them).
 */
const taskList: GanttTaskListSlots = {
  treeCell: {
    // `slots` swaps the element/component...
    slots: { expandButton: RoundToggle },
    // ...and `slotProps` merges props into it. The function form receives the
    // component's ownerState, so the glyph can follow the row's own state.
    slotProps: {
      expandButton: ({ isExpanded }) => ({ children: isExpanded ? "−" : "+" }),
    },
  },
};

const bars: GanttBarsSlots = {
  taskBar: {
    slotProps: {
      // className is merged (clsx) and style is shallow-merged, so these add to
      // the library's own values rather than replacing them. Every other prop
      // would override — including handlers.
      root: { style: { borderRadius: 8, boxShadow: "0 1px 4px rgba(0,0,0,0.25)" } },
    },
  },
  milestoneBar: {
    slotProps: { root: { style: { filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.3))" } } },
  },
};

export function SlotsDemo() {
  return <Gantt tasks={treeTasks} taskList={taskList} bars={bars} height={380} />;
}
