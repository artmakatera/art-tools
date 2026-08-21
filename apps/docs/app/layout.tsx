import type { Metadata } from "next";
import type { ReactNode } from "react";

// The only stylesheet import in the app: globals.css pulls in Tailwind and the
// library's stylesheet in the right cascade layers.
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "@art-tools/react-gantt examples",
    template: "%s · @art-tools/react-gantt",
  },
  description: "A gallery of runnable examples for the @art-tools/react-gantt component library.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
