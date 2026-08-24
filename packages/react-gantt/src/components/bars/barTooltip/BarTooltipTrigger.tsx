import {
  cloneElement,
  isValidElement,
  useEffect,
  type ComponentProps,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import { useBarTooltip } from "./BarTooltipContext";
import { rememberOpenPointer } from "./useTooltipPosition";

/**
 * Turns the element it is given into the tooltip's trigger. Belongs inside the
 * tooltip slot, under a `BarTooltipRoot` and wrapped around the slot's
 * `children`: that is what makes hover behaviour the slot's own business rather
 * than the bar's.
 *
 * It **merges** onto that element rather than wrapping it, which is not a style
 * preference: the bar contains `<button>` resize and connector handles, so a
 * wrapping trigger — Base UI's default renders a `<button>` — would nest buttons
 * and produce invalid HTML that breaks those controls. `cloneElement` adds no DOM
 * at all.
 *
 * Handlers are composed with whatever the element already has, so a consumer's
 * `slotProps.root` handlers and the a11y payload keep firing.
 */
export function BarTooltipTrigger({ children }: { children: ReactNode }) {
  const context = useBarTooltip();
  const open = context?.open ?? false;
  const setOpen = context?.setOpen;
  const anchorRef = context?.anchorRef;

  // `mouseleave` alone does not close the tooltip, and this is why it sometimes
  // stayed open. Boundary events follow *pointer movement*: when the bar leaves
  // from under a stationary pointer — a wheel scroll, a zoom changing `colWidth`,
  // a drag repositioning it — no `mouseout` is dispatched until the next pointer
  // event. Both listeners live only while open, and one bar is open at a time.
  useEffect(() => {
    if (!open || !setOpen) {
      return;
    }

    // Scroll is the case a pointer check cannot catch: a stationary cursor
    // produces no mousemove at all. Capture phase because `scroll` does not
    // bubble, on `document` so any scrolling ancestor counts.
    const closeOnScroll = () => setOpen(false);

    const closeIfOutside = (event: MouseEvent) => {
      const bar = anchorRef?.current;
      const target = event.target;

      // No node to compare against: leave it open rather than guess. Same posture
      // as the old unmeasured-rect guard.
      if (!bar || !(target instanceof Node)) {
        return;
      }
      if (!bar.contains(target)) {
        setOpen(false);
      }
    };

    document.addEventListener("scroll", closeOnScroll, { capture: true, passive: true });
    document.addEventListener("mousemove", closeIfOutside, { passive: true });
    return () => {
      document.removeEventListener("scroll", closeOnScroll, { capture: true });
      document.removeEventListener("mousemove", closeIfOutside);
    };
  }, [open, setOpen, anchorRef]);

  // `children` is typed as `ReactNode` because that is what a slot receives, so
  // the element case is checked rather than assumed. Anything else — a fragment,
  // a list, text — is handed back untouched: there is no single node to attach to.
  if (!setOpen || !isValidElement<ComponentProps<"div">>(children)) {
    return children;
  }

  const { onMouseEnter, onMouseLeave } = children.props;

  return cloneElement(children, {
    onMouseEnter: (event: ReactMouseEvent<HTMLDivElement>) => {
      onMouseEnter?.(event);
      rememberOpenPointer(event.clientX, event.clientY);
      setOpen(true);
    },
    onMouseLeave: (event: ReactMouseEvent<HTMLDivElement>) => {
      onMouseLeave?.(event);
      setOpen(false);
    },
  } as Partial<ComponentProps<"div">>);
}
