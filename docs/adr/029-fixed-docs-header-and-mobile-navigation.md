# ADR-029 — Fixed docs header and mobile navigation

- **Status:** Accepted
- **Context:** The docs header must remain available while scrolling and fit narrow screens, following the [MUI docs navigation pattern](https://mui.com/material-ui/getting-started/).

**Decision.** Use a fixed, single-row header. One CSS height variable, including
the top safe-area inset, drives header height, page padding, anchor scroll padding,
and sticky sidebar offsets. At the existing `md` breakpoint (48rem), show the
desktop links and sidebar; below it, show a hamburger trigger and a modal left
drawer with the same site links and the current documentation navigation.

Use the existing Base UI Dialog for focus containment, outside dismissal, Escape,
and page scroll locking. Dismissal restores focus to the hamburger. Following a
link closes the drawer without restoring trigger focus, allowing the destination
and router to manage focus. Route changes reset open state. Resizing to desktop
closes the modal and returns focus to the visible home link, so a hidden trigger
cannot leave the desktop page inert. The drawer scrolls independently and its
transition respects reduced motion.

**Rejected.** Wrapping the full header navigation onto multiple rows makes its
fixed height depend on width and text size. Hiding an open modal with CSS alone
leaves its focus trap and scroll lock active. Keeping the old inline disclosure
would change the fixed header's height every time navigation opens.

**Cost accepted.** The mobile drawer adds a client-side dialog to the docs shell.
The JavaScript media query must match the CSS navigation breakpoint. Library
chart behavior and public API remain unchanged.
