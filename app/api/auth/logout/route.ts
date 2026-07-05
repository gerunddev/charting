import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

// Plain HTML form POST from the nav — destroy the session and go home.
export async function POST(req: Request) {
  const session = await getSession();
  session.destroy();
  return NextResponse.redirect(new URL("/", req.url), 303);
}
