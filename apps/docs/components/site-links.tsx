import Link from "next/link";

/** Shared destinations keep the mobile drawer and desktop header in sync. */
export function SiteLinks() {
  return (
    <>
      <Link href="/#examples" className="docs-control docs-site-link">
        Examples
      </Link>
      <Link href="/api" className="docs-control docs-site-link">
        API
      </Link>
      <a href="https://github.com/artmakatera/art-tools" className="docs-control docs-site-link">
        GitHub
      </a>
      <Link href="/#install" className="docs-control docs-site-link" data-prominent>
        Get started
      </Link>
    </>
  );
}
