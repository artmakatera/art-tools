"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dialog } from "@base-ui/react/dialog";
import { Nav } from "./nav";
import { ApiNav } from "./api-nav";
import { SiteLinks } from "./site-links";

function MobileNavDrawer({ isApi }: { isApi: boolean }) {
  const [open, setOpen] = useState(false);
  const finalFocus = useRef<boolean | HTMLElement>(true);

  useEffect(() => {
    if (!open) {
      return;
    }
    // Must match Tailwind's md breakpoint. Hiding an open modal with CSS alone
    // would leave the desktop page inert and scroll-locked.
    // See docs/adr/029-fixed-docs-header-and-mobile-navigation.md.
    const desktop = window.matchMedia("(min-width: 48rem)");
    const closeOnDesktop = () => {
      if (!desktop.matches) {
        return;
      }
      finalFocus.current = document.getElementById("site-home") ?? false;
      setOpen(false);
    };
    closeOnDesktop();
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, [open]);

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          finalFocus.current = true;
        }
        setOpen(nextOpen);
      }}
    >
      <Dialog.Trigger
        aria-label="Open navigation"
        className="docs-control flex size-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-100 md:hidden dark:border-slate-800 dark:hover:bg-slate-800"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="docs-nav-backdrop fixed inset-0 z-[60] bg-slate-950/40 md:hidden" />
        <Dialog.Popup
          finalFocus={() => finalFocus.current}
          className="docs-nav-drawer fixed inset-y-0 left-0 z-[70] flex h-dvh w-[min(20rem,calc(100vw-3rem))] flex-col border-r border-slate-200 bg-white shadow-xl md:hidden dark:border-slate-800 dark:bg-slate-950"
          onClickCapture={(event) => {
            if (
              !(event.target instanceof Element) ||
              !event.target.closest("a[href]") ||
              event.button !== 0 ||
              event.metaKey ||
              event.ctrlKey ||
              event.shiftKey ||
              event.altKey
            ) {
              return;
            }
            // Let the destination/router manage focus after navigation. Escape,
            // the backdrop, and the close button still restore the trigger.
            finalFocus.current = false;
            setOpen(false);
          }}
        >
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 p-3 dark:border-slate-800">
            <Dialog.Title className="pl-1 font-semibold">Navigation</Dialog.Title>
            <Dialog.Close
              aria-label="Close navigation"
              className="docs-control flex size-11 items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="m6 6 12 12M6 18 18 6" />
              </svg>
            </Dialog.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-6">
            <nav
              aria-label="Site navigation"
              className="flex flex-col gap-1 border-b border-slate-200 py-4 text-sm font-medium dark:border-slate-800"
            >
              <Link href="/" className="docs-control docs-site-link">
                Home
              </Link>
              <SiteLinks />
            </nav>
            <div className="pt-5">{isApi ? <ApiNav /> : <Nav />}</div>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  const isApi = pathname === "/api" || pathname.startsWith("/api/");
  // Route changes discard open state, including when navigating Back later.
  return <MobileNavDrawer key={pathname} isApi={isApi} />;
}
