import Link from "next/link";
import { notFound } from "next/navigation";
import ChartViewer from "@/components/ChartViewer";
import CopyButton from "@/components/CopyButton";
import { currentUser } from "@/lib/auth";
import { getPublished } from "@/lib/repo";

// Public view of a published chart. Shareable; no account needed to view.
export default async function PublicChart({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [pub, user] = await Promise.all([
    getPublished(id).catch(() => null),
    currentUser().catch(() => null),
  ]);
  if (!pub) notFound();

  return (
    <div className="wrap">
      <header className="app">
        <h1>{pub.doc.title}</h1>
        <span className="meta">
          by {pub.ownerName} · {pub.doc.timeSignature} · written in {pub.doc.writtenKey}
        </span>
      </header>

      <p className="cardtags">
        {pub.tags.map((t) => (
          <Link href={`/?tag=${encodeURIComponent(t)}`} className="tag" key={t}>
            {t}
          </Link>
        ))}
      </p>

      <p>
        {user ? (
          <CopyButton publishedId={pub.id} />
        ) : (
          <Link href="/signup">Sign up to copy this chart and make your own version</Link>
        )}
      </p>

      <ChartViewer doc={pub.doc} />
    </div>
  );
}
