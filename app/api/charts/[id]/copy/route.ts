import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { getPublished, putChart } from "@/lib/repo";
import type { ChartRecord } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

// Copy a PUBLISHED chart into the signed-in user's catalog (a "rendition").
export async function POST(_req: Request, { params }: Ctx) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const pub = await getPublished(id);
  if (!pub) return NextResponse.json({ error: "not found" }, { status: 404 });

  const now = new Date().toISOString();
  const rec: ChartRecord = {
    id: crypto.randomUUID(),
    ownerId: user.id,
    tags: [...pub.tags],
    published: false,
    createdAt: now,
    updatedAt: now,
    doc: structuredClone(pub.doc),
    origin: { publishedId: pub.id, ownerName: pub.ownerName },
  };
  await putChart(rec);
  return NextResponse.json({ id: rec.id });
}
