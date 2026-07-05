import Link from "next/link";
import { redirect } from "next/navigation";
import { NewChartButton, RowActions } from "@/components/ChartActions";
import { currentUser } from "@/lib/auth";
import { listCharts } from "@/lib/repo";
import { barToToken } from "@/lib/shorthand";

// The signed-in user's private catalog.
export default async function MyCharts({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string }>;
}) {
  const user = await currentUser().catch(() => null);
  if (!user) redirect("/login");

  const { tag } = await searchParams;
  const all = await listCharts(user.id);
  const charts = tag ? all.filter((c) => c.tags.includes(tag)) : all;

  // Tag cloud from the user's own charts.
  const tagCounts = new Map<string, number>();
  for (const c of all) for (const t of c.tags) tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);

  return (
    <div className="wrap">
      <header className="app">
        <h1>My charts</h1>
        <span className="meta">
          {all.length} chart{all.length === 1 ? "" : "s"}
        </span>
        <span className="navspacer" />
        <NewChartButton />
      </header>

      {tagCounts.size > 0 && (
        <p className="cardtags">
          {tag && (
            <Link href="/me" className="tag active">
              ✕ {tag}
            </Link>
          )}
          {[...tagCounts.entries()]
            .filter(([t]) => t !== tag)
            .sort((a, b) => b[1] - a[1])
            .map(([t, n]) => (
              <Link href={`/me?tag=${encodeURIComponent(t)}`} className="tag" key={t}>
                {t} ({n})
              </Link>
            ))}
        </p>
      )}

      {charts.length === 0 ? (
        <p className="hint">
          {tag ? "No charts with that tag." : "No charts yet — create your first one."}
        </p>
      ) : (
        <div className="chartlist">
          {charts.map((c) => (
            <div className="chartrow" key={c.id}>
              <div className="chartinfo">
                <Link href={`/me/edit/${c.id}`} className="charttitle">
                  {c.doc.title}
                </Link>
                <span className="cardmeta">
                  {c.doc.writtenKey} · {c.doc.measures.length} bars ·{" "}
                  {c.doc.measures.slice(0, 4).map(barToToken).join(" | ")}
                  {c.origin && ` · copied from ${c.origin.ownerName}`}
                </span>
                <span className="cardtags">
                  {c.tags.map((t) => (
                    <span className="tag" key={t}>
                      {t}
                    </span>
                  ))}
                  {c.published && (
                    <Link href={`/chart/${c.id}`} className="tag published">
                      published ↗
                    </Link>
                  )}
                </span>
              </div>
              <RowActions id={c.id} published={c.published} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
