"use client";

import { useState } from "react";
import { sampleChart } from "@/lib/sample";
import { KEYS, chordParts, nashvilleParts, type ChordParts } from "@/lib/music";
import type { Chart } from "@/lib/types";

const PER_LINE = 4; // measures per line
type Mode = "nashville" | "keys";

export default function Page() {
  const chart = sampleChart;
  const [key, setKey] = useState(chart.writtenKey);
  const [mode, setMode] = useState<Mode>("nashville");

  return (
    <div className="wrap">
      <header className="app">
        <h1>{chart.title}</h1>
        <span className="meta">
          {chart.timeSignature} · written in {chart.writtenKey}
        </span>
      </header>

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

      {chart.sections.map((section) => {
        // Break the section's measures into lines of PER_LINE.
        const lines: { start: number; end: number }[] = [];
        for (let s = section.start; s <= section.end; s += PER_LINE) {
          lines.push({ start: s, end: Math.min(s + PER_LINE - 1, section.end) });
        }
        return (
          <div className="section" key={section.name}>
            <h2>{section.name}</h2>
            {lines.map((line) => (
              <LineView
                key={line.start}
                chart={chart}
                lineStart={line.start}
                lineEnd={line.end}
                displayKey={key}
                mode={mode}
              />
            ))}
          </div>
        );
      })}

      <p className="note">
        Toggle <strong>Show Nashville</strong> vs <strong>Show keys</strong>: the same canonical
        chart renders either as key-independent numbers or as concrete chords for the chosen key.
        Transposition is a <em>rendering</em> choice, not a mutation of the song. The tab
        <code>Hook lick</code> is absolute, so it stays pinned to its written key ({chart.writtenKey}).
      </p>
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
  chart,
  lineStart,
  lineEnd,
  displayKey,
  mode,
}: {
  chart: Chart;
  lineStart: number;
  lineEnd: number;
  displayKey: string;
  mode: Mode;
}) {
  const col = (globalIndex: number) => globalIndex - lineStart + 1; // 1-based grid column

  const measures = chart.measures.filter((mm) => mm.index >= lineStart && mm.index <= lineEnd);
  const inserts = chart.inserts.filter((i) => i.start <= lineEnd && i.end >= lineStart);
  const annotations = chart.annotations.filter((a) => {
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
            <div className="pinned">pinned to written key ({chart.writtenKey})</div>
          </div>
        );
      })}
    </div>
  );
}
