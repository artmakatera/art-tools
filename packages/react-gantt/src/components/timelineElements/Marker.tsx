import type { ComponentProps, ElementType } from "react";
import { mergeSlotProps, type SlotConfig, type SlotPropsInput } from "../../core/slots";
import { useGanttSlots } from "../../context/GanttSlotsContext";
import styles from "./TimelineElements.module.css";

export interface MarkerOwnerState {
  date: Date;
  title?: string;
  visibleTop: number;
}

export interface MarkerSlots {
  root?: ElementType;
  line?: ElementType;
  label?: ElementType;
}

export interface MarkerSlotProps {
  root?: SlotPropsInput<ComponentProps<"div">, MarkerOwnerState>;
  line?: SlotPropsInput<ComponentProps<"div">, MarkerOwnerState>;
  label?: SlotPropsInput<ComponentProps<"span">, MarkerOwnerState>;
}

export type MarkerSlotConfig = SlotConfig<MarkerSlots, MarkerSlotProps>;

export interface MarkerProps extends Omit<ComponentProps<"div">, "title" | "children"> {
  date: Date;
  visibleTop?: number;
  /** Layout values supplied by the timeline layer, consumed without forwarding to the DOM. */
  x?: number;
  bodyHeight?: number;
  visibleHeight?: number;
  title?: string;
  formatDate?: (date: Date) => string;
  slots?: MarkerSlots;
  slotProps?: MarkerSlotProps;
}

function formatDateDefault(date: Date): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(
    date,
  );
}

/** A display-only date line; only its label participates in pointer hit testing. */
export function Marker({
  date,
  title,
  visibleTop = 0,
  x: _x,
  bodyHeight: _bodyHeight,
  visibleHeight: _visibleHeight,
  formatDate = formatDateDefault,
  slots,
  slotProps,
  ...rootProps
}: MarkerProps) {
  const config = useGanttSlots().timeline?.marker;
  const state: MarkerOwnerState = { date, title, visibleTop };
  const Root = slots?.root ?? config?.slots?.root ?? "div";
  const Line = slots?.line ?? config?.slots?.line ?? "div";
  const Label = slots?.label ?? config?.slots?.label ?? "span";
  const root = mergeSlotProps(
    mergeSlotProps<ComponentProps<"div">, MarkerOwnerState>(
      { className: styles.marker },
      config?.slotProps?.root,
      state,
    ),
    slotProps?.root,
    state,
  );
  const line = mergeSlotProps(
    mergeSlotProps({ className: styles.line, "aria-hidden": true }, config?.slotProps?.line, state),
    slotProps?.line,
    state,
  );
  const label = mergeSlotProps(
    mergeSlotProps(
      {
        className: styles.label,
        style: { top: visibleTop },
        title: formatDate(date),
        children: title,
      },
      config?.slotProps?.label,
      state,
    ),
    slotProps?.label,
    state,
  );
  return (
    <Root {...mergeSlotProps(root, rootProps, state)}>
      <Line {...line} />
      {title !== undefined ? <Label {...label} /> : null}
    </Root>
  );
}
