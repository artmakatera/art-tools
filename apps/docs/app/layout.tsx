import { SiteHeader } from "@/components/site-header";
import type { Metadata } from "next";
import type { ReactNode } from "react";

// The only stylesheet import in the app: globals.css pulls in Tailwind and the
// library's stylesheet in the right cascade layers.
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "@art-tools/react-gantt docs",
    template: "%s · @art-tools/react-gantt",
  },
  description:
    "API reference and runnable examples for the @art-tools/react-gantt component library.",
  icons: { icon: "/logo.svg" },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
