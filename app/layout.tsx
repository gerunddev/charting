import type { ReactNode } from "react";
import Link from "next/link";
import { currentUser } from "@/lib/auth";
import "./globals.css";

export const metadata = {
  title: "Charting",
  description: "Nashville-based charts with layered inserts and live transposition",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const user = await currentUser().catch(() => null); // DB may not be seeded yet

  return (
    <html lang="en">
      <body>
        <nav className="topnav">
          <Link href="/" className="brand">
            Charting
          </Link>
          <span className="navspacer" />
          <Link href="/">Browse</Link>
          {user ? (
            <>
              <Link href="/me">My charts</Link>
              <span className="whoami">{user.name}</span>
              <form action="/api/auth/logout" method="post">
                <button type="submit">Log out</button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login">Log in</Link>
              <Link href="/signup" className="cta">
                Sign up
              </Link>
            </>
          )}
        </nav>
        {children}
      </body>
    </html>
  );
}
