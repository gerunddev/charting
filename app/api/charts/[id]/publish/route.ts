import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { getChart, publishChart, putChart, unpublishChart } from "@/lib/repo";

type Ctx = { params: Promise<{ id: string }> };

// Publish (or republish) a snapshot of the chart to the public catalog.
export async function POST(_req: Request, { params }: Ctx) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const rec = await getChart(user.id, id);
  if (!rec) return NextResponse.json({ error: "not found" }, { status: 404 });

  await publishChart(rec, user.name);
  if (!rec.published) await putChart({ ...rec, published: true });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const rec = await getChart(user.id, id);
  if (!rec) return NextResponse.json({ error: "not found" }, { status: 404 });

  await unpublishChart(id);
  if (rec.published) await putChart({ ...rec, published: false });
  return NextResponse.json({ ok: true });
}
