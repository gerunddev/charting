"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ChartViewer from "./ChartViewer";
import { KEYS } from "@/lib/music";
import { buildFromEditor, sectionToLine } from "@/lib/shorthand";
import type { Annotation, Chart, ChartRecord, Insert } from "@/lib/types";

interface SectionRow {
  name: string;
  bars: string;
}

export default function Editor({ record }: { record: ChartRecord }) {
  const router = useRouter();
  const doc = record.doc;

  const [title, setTitle] = useState(doc.title);
  const [writtenKey, setWrittenKey] = useState(doc.writtenKey);
  const [timeSignature, setTimeSignature] = useState(doc.timeSignature);
  const [tagsText, setTagsText] = useState(record.tags.join(", "));
  const [rows, setRows] = useState<SectionRow[]>(
    doc.sections.map((s) => ({ name: s.name, bars: sectionToLine(doc, s) }))
  );
  const [insertsJson, setInsertsJson] = useState(JSON.stringify(doc.inserts, null, 2));
  const [annotationsJson, setAnnotationsJson] = useState(JSON.stringify(doc.annotations, null, 2));
  const [flash, setFlash] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Rebuild the doc from editor state on every keystroke; show errors inline.
  const preview = useMemo((): { doc: Chart } | { error: string } => {
    try {
      const { sections, measures } = buildFromEditor(rows);
      const inserts = JSON.parse(insertsJson) as Insert[];
      const annotations = JSON.parse(annotationsJson) as Annotation[];
      return {
        doc: { title, writtenKey, timeSignature, sections, measures, inserts, annotations },
      };
    } catch (e) {
      return { error: (e as Error).message };
    }
  }, [rows, title, writtenKey, timeSignature, insertsJson, annotationsJson]);

  function updateRow(i: number, patch: Partial<SectionRow>) {
    setRows((r) => r.map((row, j) => (j === i ? { ...row, ...patch } : row)));
  }

  async function save() {
    if ("error" in preview) return;
    setBusy(true);
    setSaveError(null);
    const tags = tagsText
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0);
    const res = await fetch(`/api/charts/${record.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ doc: preview.doc, tags }),
    });
    setBusy(false);
    if (res.ok) {
      setFlash("Saved ✓");
      setTimeout(() => setFlash(null), 2000);
      router.refresh();
    } else {
      setSaveError("Save failed");
    }
  }

  return (
    <div className="editor">
      <div className="editrow">
        <label>
          Title
          <input value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label>
          Written key
          <select value={writtenKey} onChange={(e) => setWrittenKey(e.target.value)}>
            {KEYS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </label>
        <label>
          Time
          <input value={timeSignature} onChange={(e) => setTimeSignature(e.target.value)} size={4} />
        </label>
        <label className="grow">
          Tags (comma-separated)
          <input
            value={tagsText}
            onChange={(e) => setTagsText(e.target.value)}
            placeholder="country, worship, practice"
          />
        </label>
      </div>

      <h3>Sections</h3>
      <p className="hint">
        Bars separated by <code>|</code>, split bars with spaces: <code>1 | 5 | 6m 4 | 1</code>.
        Qualities: <code>m 7 maj7 m7 dim sus4</code>, accidentals <code>b7 #4</code>.
      </p>
      {rows.map((row, i) => (
        <div className="editrow sectionrow" key={i}>
          <input
            className="sectionname"
            value={row.name}
            onChange={(e) => updateRow(i, { name: e.target.value })}
            placeholder="Verse"
          />
          <input
            className="grow mono"
            value={row.bars}
            onChange={(e) => updateRow(i, { bars: e.target.value })}
            placeholder="1 | 5 | 6m | 4"
          />
          <button className="danger" onClick={() => setRows((r) => r.filter((_, j) => j !== i))}>
            ✕
          </button>
        </div>
      ))}
      <button onClick={() => setRows((r) => [...r, { name: "Section", bars: "1 | 4 | 1 | 5" }])}>
        + Add section
      </button>

      <details className="advanced">
        <summary>Inserts & annotations (JSON)</summary>
        <div className="editrow">
          <label className="grow">
            Inserts
            <textarea
              rows={8}
              value={insertsJson}
              onChange={(e) => setInsertsJson(e.target.value)}
            />
          </label>
          <label className="grow">
            Annotations
            <textarea
              rows={8}
              value={annotationsJson}
              onChange={(e) => setAnnotationsJson(e.target.value)}
            />
          </label>
        </div>
      </details>

      <div className="editrow savebar">
        <button className="primary" onClick={save} disabled={busy || "error" in preview}>
          {busy ? "Saving…" : "Save"}
        </button>
        {flash && <span className="flash">{flash}</span>}
        {saveError && <span className="error">{saveError}</span>}
        {"error" in preview && <span className="error">{preview.error}</span>}
      </div>

      <h3>Preview</h3>
      {"doc" in preview ? (
        <ChartViewer doc={preview.doc} />
      ) : (
        <p className="error">Fix the error above to see the preview.</p>
      )}
    </div>
  );
}
