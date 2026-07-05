import { cookies } from "next/headers";
import { getIronSession, type IronSession } from "iron-session";
import { getUserById } from "./repo";
import type { User } from "./types";

// Local-dev auth: iron-session encrypted cookie + bcrypt passwords in the DB.
// This module is the ONLY place the app knows how auth works — swapping to a
// managed provider (Cognito/Clerk) later means reimplementing these helpers,
// not touching pages or API routes.

export interface SessionData {
  userId?: string;
}

const sessionOptions = {
  password: process.env.SESSION_SECRET ?? "charting-dev-secret-change-me-please-32chars",
  cookieName: "charting_session",
  cookieOptions: { secure: process.env.NODE_ENV === "production" },
};

export async function getSession(): Promise<IronSession<SessionData>> {
  return getIronSession<SessionData>(await cookies(), sessionOptions);
}

// The signed-in user, or null. Safe to call from server components and routes.
export async function currentUser(): Promise<User | null> {
  const session = await getSession();
  if (!session.userId) return null;
  return getUserById(session.userId);
}
