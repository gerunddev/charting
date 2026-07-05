import Link from "next/link";
import { listPublished } from "@/lib/repo";
import { barToToken } from "@/lib/shorthand";
import type { PublishedChart } from "@/lib/types";

// Public catalog: browse + search published charts. No account needed.
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tag?: string }>;
}) {
  const { q, tag } = await searchParams;

  let charts: PublishedChart[] = [];
  let dbDown = false;
  try {
    charts = await listPublished();
  } catch {
    dbDown = true; // table missing or DynamoDB Local not running
  }

  const query = (q ?? "").trim().toLowerCase();
  const results = charts.filter((c) => {
    if (tag && !c.tags.includes(tag)) return false;
    if (!query) return true;
    const hay = [c.doc.title, c.ownerName, ...c.tags].join(" ").toLowerCase();
    return hay.includes(query);
  });

  return (
    <div className="wrap">
      <header className="app">
        <h1>Public charts</h1>
        <span className="meta">search the catalog — no account needed</span>
      </header>

      <form className="searchbar" action="/" method="get">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search by title, author, or tag…"
        />
        {tag && <input type="hidden" name="tag" value={tag} />}
        <button type="submit">Search</button>
        {(q || tag) && (
          <Link className="clear" href="/">
            Clear
          </Link>
        )}
      </form>

      {tag && (
        <p className="hint">
          Filtering by tag: <span className="tag">{tag}</span>
        </p>
      )}

      {dbDown ? (
        <p className="error">
          Database not reachable. Run <code>npm run db:up</code> then <code>npm run seed</code>.
        </p>
      ) : results.length === 0 ? (
        <p className="hint">No published charts match. Sign up and publish the first one!</p>
      ) : (
        <div className="cards">
          {results.map((c) => (
            <Link href={`/chart/${c.id}`} className="card" key={c.id}>
              <h3>{c.doc.title}</h3>
              <p className="cardmeta">
                by {c.ownerName} · {c.doc.writtenKey} · {c.doc.timeSignature}
              </p>
              <p className="cardbars mono">
                {c.doc.measures.slice(0, 4).map(barToToken).join(" | ")}
                {c.doc.measures.length > 4 ? " | …" : ""}
              </p>
              <p className="cardtags">
                {c.tags.map((t) => (
                  <span className="tag" key={t}>
                    {t}
                  </span>
                ))}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
