import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSession } from "@/lib/auth";
import { getUserByEmail } from "@/lib/repo";

export async function POST(req: Request) {
  const { email, password } = await req.json().catch(() => ({}));
  if (typeof email !== "string" || typeof password !== "string")
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });

  const user = await getUserByEmail(email);
  if (!user || !(await bcrypt.compare(password, user.passwordHash)))
    return NextResponse.json({ error: "Wrong email or password" }, { status: 401 });

  const session = await getSession();
  session.userId = user.id;
  await session.save();
  return NextResponse.json({ id: user.id });
}
