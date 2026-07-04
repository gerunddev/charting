import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "Charting — prototype",
  description: "Nashville-based charts with layered inserts and live transposition",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
