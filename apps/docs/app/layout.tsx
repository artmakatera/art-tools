import type { Metadata } from "next";
import type { ReactNode } from "react";

// The only stylesheet import in the app: globals.css pulls in Tailwind and the
// library's stylesheet in the right cascade layers.
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "@am/react-gantt examples",
    template: "%s · @am/react-gantt",
  },
  description:
    "A gallery of runnable examples for the @am/react-gantt component library.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
