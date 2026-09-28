# ADR-024: Bar roots own stacking

Status: Accepted

## Decision

Apply `--am-gantt-task-bar-z-index` to the positioned roots of task, project,
and milestone bars. Rows retain `z-index: auto`, so their borders stay below
dependency links. Bar descendants keep their own stacking rules. The progress
resize handle uses `--am-gantt-bar-progress-resize-handle-z-index` (default `10`).

## Reason

The previous `.row div` selector assigned a z-index to every nested div. It
created a stacking context on the progress fill and gave the later label the
same stacking level. The label then covered the progress handle; increasing the
handle's z-index could not escape its ancestor's stacking context. The selector
also overrode the handle's own z-index declaration through higher specificity.

## Alternatives and cost

Elevating the row also paints its border above dependency links. Raising the
entire progress fill would raise its shading above the label. Disabling pointer
events on labels would constrain consumer-provided label content.

Each bar instead forms its own stacking context, preserving the local ordering
of its label and progress handle while keeping row borders below dependency
links. Descendants cannot out-rank another bar's stacking context; tooltips use
a portal to escape it. Dependency connector handles remain outside the bars
and retain their own stacking level.
