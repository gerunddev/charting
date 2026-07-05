import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { putChart } from "@/lib/repo";
import type { Chart, ChartRecord } from "@/lib/types";

// Create a new chart with a simple starter progression.
export async function POST() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const doc: Chart = {
    title: "Untitled chart",
    writtenKey: "C",
    timeSignature: "4/4",
    sections: [{ name: "Verse", start: 0, end: 3 }],
    measures: [1, 4, 1, 5].map((degree, index) => ({
      index,
      chords: [{ degree, quality: "maj" as const }],
    })),
    inserts: [],
    annotations: [],
  };

  const now = new Date().toISOString();
  const rec: ChartRecord = {
    id: crypto.randomUUID(),
    ownerId: user.id,
    tags: [],
    published: false,
    createdAt: now,
    updatedAt: now,
    doc,
  };
  await putChart(rec);
  return NextResponse.json({ id: rec.id });
}
