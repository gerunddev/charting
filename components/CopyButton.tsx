"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// "Copy to my catalog" on a public chart page (only rendered when signed in).
export default function CopyButton({ publishedId }: { publishedId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function copy() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/charts/${publishedId}/copy`, { method: "POST" });
    setBusy(false);
    if (res.ok) {
      const { id } = await res.json();
      router.push(`/me/edit/${id}`);
    } else {
      setError("Copy failed");
    }
  }

  return (
    <span>
      <button className="primary" onClick={copy} disabled={busy}>
        {busy ? "Copying…" : "Copy to my catalog"}
      </button>
      {error && <span className="error"> {error}</span>}
    </span>
  );
}
