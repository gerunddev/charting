"use client";

import { useState } from "react";
import { KEYS, chordParts, nashvilleParts, type ChordParts } from "@/lib/music";
import type { Chart } from "@/lib/types";

const PER_LINE = 4; // measures per line
type Mode = "nashville" | "keys";

// Renders a chart doc with the Nashville/keys toggle and key picker.
// Used on the public chart page, the editor preview, and anywhere else.
export default function ChartViewer({ doc }: { doc: Chart }) {
  const [key, setKey] = useState(doc.writtenKey);
  const [mode, setMode] = useState<Mode>("nashville");

  return (
    <div>
      <div className="toolbar">
        <div className="seg">
          <button className={mode === "nashville" ? "active" : ""} onClick={() => setMode("nashville")}>
            Show Nashville
          </button>
          <button className={mode === "keys" ? "active" : ""} onClick={() => setMode("keys")}>
            Show keys
          </button>
        </div>
        <div>
          <label htmlFor="key">Key</label>
          <select id="key" value={key} onChange={(e) => setKey(e.target.value)}>
            {KEYS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </div>
        {mode === "keys" && <span className="keypill">key of {key}</span>}
      </div>

      {doc.sections.map((section, si) => {
        const lines: { start: number; end: number }[] = [];
        for (let s = section.start; s <= section.end; s += PER_LINE) {
          lines.push({ start: s, end: Math.min(s + PER_LINE - 1, section.end) });
        }
        return (
          <div className="section" key={`${section.name}-${si}`}>
            <h2>{section.name}</h2>
            {lines.map((line) => (
              <LineView
                key={line.start}
                doc={doc}
                lineStart={line.start}
                lineEnd={line.end}
                displayKey={key}
                mode={mode}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}

// A single chord label with superscripted extensions (7, maj7, °…).
function ChordText({ parts }: { parts: ChordParts }) {
  return (
    <span>
      {parts.base}
      {parts.inline}
      {parts.sup && <sup>{parts.sup}</sup>}
    </span>
  );
}

function LineView({
  doc,
  lineStart,
  lineEnd,
  displayKey,
  mode,
}: {
  doc: Chart;
  lineStart: number;
  lineEnd: number;
  displayKey: string;
  mode: Mode;
}) {
  const col = (globalIndex: number) => globalIndex - lineStart + 1; // 1-based grid column

  const measures = doc.measures.filter((mm) => mm.index >= lineStart && mm.index <= lineEnd);
  const inserts = doc.inserts.filter((i) => i.start <= lineEnd && i.end >= lineStart);
  const annotations = doc.annotations.filter((a) => {
    const s = a.kind === "point" ? a.at! : a.start!;
    const e = a.kind === "point" ? a.at! : a.end!;
    return s <= lineEnd && e >= lineStart;
  });

  return (
    <div
      className="grid line"
      style={{ gridTemplateColumns: `repeat(${PER_LINE}, minmax(96px, 1fr))` }}
    >
      {measures.map((mm) => (
        <div className="cell" style={{ gridColumn: col(mm.index) }} key={mm.index}>
          <div className="beats">
            {mm.chords.map((c, i) => (
              <span className="nash" key={i}>
                <ChordText parts={mode === "keys" ? chordParts(c, displayKey) : nashvilleParts(c)} />
              </span>
            ))}
          </div>
          <span className="barnum">{mm.index + 1}</span>
        </div>
      ))}

      {annotations.map((a, i) => {
        if (a.kind === "point") {
          return (
            <div className="annot-point" style={{ gridColumn: col(a.at!) }} key={`a${i}`}>
              {a.text}
            </div>
          );
        }
        const start = Math.max(a.start!, lineStart);
        const end = Math.min(a.end!, lineEnd);
        return (
          <div
            className="annot-span"
            style={{ gridColumn: `${col(start)} / span ${end - start + 1}` }}
            key={`a${i}`}
          >
            {a.text}
          </div>
        );
      })}

      {inserts.map((ins, i) => {
        const start = Math.max(ins.start, lineStart);
        const end = Math.min(ins.end, lineEnd);
        return (
          <div
            className="insert"
            style={{ gridColumn: `${col(start)} / span ${end - start + 1}` }}
            key={`i${i}`}
          >
            <div className="ilabel">
              {ins.label} · bars {ins.start + 1}–{ins.end + 1}
            </div>
            <pre>{ins.lines.join("\n")}</pre>
            <div className="pinned">pinned to written key ({doc.writtenKey})</div>
          </div>
        );
      })}
    </div>
  );
}
