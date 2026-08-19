import { clsx } from "clsx";
import type { CSSProperties } from "react";

/**
 * A consumer-supplied `slotProps` value for a single slot: either a props object,
 * or a function of the component's `ownerState` returning props.
 *
 * `P` is the target element's prop type. Per-slot we pass the native element props
 * (e.g. `ComponentProps<"button">`) so consumers get `className` / `onClick` / aria /
 * `data-*` autocomplete. If a consumer replaces the element with a custom component
 * via `slots`, the props stay loosely typed against the native shape (MUI's default).
 */
export type SlotPropsInput<P, OwnerState> = Partial<P> | ((ownerState: OwnerState) => Partial<P>);

/** Convenience shape for a component's public `{ slots, slotProps }` config prop. */
export interface SlotConfig<Slots, SlotProps> {
  slots?: Slots;
  slotProps?: SlotProps;
}

/**
 * Merge library-owned internal props with a consumer's `slotProps` for one slot.
 *
 * - `className`: `clsx(internal, external)` — both apply, the consumer's comes last.
 * - `style`: shallow-merged, the consumer wins per key.
 * - all other props: the consumer overrides the internal value (MUI semantics — e.g.
 *   passing `onClick` replaces the default handler; this is the consumer's
 *   responsibility to preserve behavior).
 */
export function mergeSlotProps<
  Props extends { className?: string; style?: CSSProperties },
  OwnerState,
>(
  internalProps: Props,
  slotProps: SlotPropsInput<Props, OwnerState> | undefined,
  ownerState: OwnerState,
): Props {
  const external = typeof slotProps === "function" ? slotProps(ownerState) : slotProps;
  if (!external) {
    return internalProps;
  }
  const { className, style, ...rest } = external;
  return {
    ...internalProps,
    ...rest,
    className: clsx(internalProps.className, className),
    style: { ...internalProps.style, ...style },
  } as Props;
}
