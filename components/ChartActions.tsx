"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Buttons for the "My charts" list: new / publish / unpublish / delete.

export function NewChartButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function create() {
    setBusy(true);
    const res = await fetch("/api/charts", { method: "POST" });
    setBusy(false);
    if (res.ok) {
      const { id } = await res.json();
      router.push(`/me/edit/${id}`);
    }
  }

  return (
    <button className="primary" onClick={create} disabled={busy}>
      {busy ? "Creating…" : "+ New chart"}
    </button>
  );
}

export function RowActions({ id, published }: { id: string; published: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function call(method: string, path: string) {
    setBusy(true);
    await fetch(path, { method });
    setBusy(false);
    router.refresh();
  }

  return (
    <span className="rowactions">
      <button onClick={() => router.push(`/me/edit/${id}`)}>Edit</button>
      <button onClick={() => call("POST", `/api/charts/${id}/publish`)} disabled={busy}>
        {published ? "Republish" : "Publish"}
      </button>
      {published && (
        <button onClick={() => call("DELETE", `/api/charts/${id}/publish`)} disabled={busy}>
          Unpublish
        </button>
      )}
      <button
        className="danger"
        disabled={busy}
        onClick={() => {
          if (confirm("Delete this chart? This also removes it from the public catalog.")) {
            call("DELETE", `/api/charts/${id}`);
          }
        }}
      >
        Delete
      </button>
    </span>
  );
}
