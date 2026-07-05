import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSession } from "@/lib/auth";
import { createUser, getUserByEmail } from "@/lib/repo";

export async function POST(req: Request) {
  const { email, password, name } = await req.json().catch(() => ({}));
  if (typeof email !== "string" || !email.includes("@"))
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  if (typeof password !== "string" || password.length < 8)
    return NextResponse.json({ error: "Password must be 8+ characters" }, { status: 400 });
  if (typeof name !== "string" || name.trim().length < 2)
    return NextResponse.json({ error: "Display name required" }, { status: 400 });

  if (await getUserByEmail(email))
    return NextResponse.json({ error: "An account with that email already exists" }, { status: 409 });

  const user = {
    id: crypto.randomUUID(),
    email: email.toLowerCase(),
    name: name.trim(),
    passwordHash: await bcrypt.hash(password, 10),
    createdAt: new Date().toISOString(),
  };
  await createUser(user);

  const session = await getSession();
  session.userId = user.id;
  await session.save();
  return NextResponse.json({ id: user.id });
}
