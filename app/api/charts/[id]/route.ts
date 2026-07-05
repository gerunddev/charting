import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { deleteChart, getChart, putChart } from "@/lib/repo";
import type { Chart } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const rec = await getChart(user.id, id);
  if (!rec) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(rec);
}

export async function PUT(req: Request, { params }: Ctx) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const rec = await getChart(user.id, id);
  if (!rec) return NextResponse.json({ error: "not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const doc = body?.doc as Chart | undefined;
  const tags = body?.tags as string[] | undefined;
  // Light shape validation — enough to keep the renderer from crashing.
  if (
    !doc ||
    typeof doc.title !== "string" ||
    !Array.isArray(doc.sections) ||
    !Array.isArray(doc.measures) ||
    !Array.isArray(doc.inserts) ||
    !Array.isArray(doc.annotations) ||
    !Array.isArray(tags)
  ) {
    return NextResponse.json({ error: "invalid chart" }, { status: 400 });
  }

  await putChart({
    ...rec,
    doc,
    tags: tags.map((t) => String(t).toLowerCase()),
    updatedAt: new Date().toISOString(),
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  await deleteChart(user.id, id);
  return NextResponse.json({ ok: true });
}
