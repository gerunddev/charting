import type { Chart, Chord, Measure, Quality, Section } from "./types";

// Text shorthand for entering charts, one line per section:
//   bars separated by "|", chords in a bar separated by spaces
//   chord = [b|#] degree [quality]   e.g.  1   5   6m   4maj7   b7   2m7   5sus4
// "1 | 5 | 6m 4 | 1" = four bars, third bar split between 6m and 4.

const QUALITY_TOKENS: Record<string, Quality> = {
  "": "maj",
  m: "min",
  "7": "7",
  maj7: "maj7",
  m7: "m7",
  dim: "dim",
  "°": "dim",
  sus4: "sus4",
  sus: "sus4",
};

const QUALITY_OUT: Record<Quality, string> = {
  maj: "",
  min: "m",
  "7": "7",
  maj7: "maj7",
  m7: "m7",
  dim: "dim",
  sus4: "sus4",
};

export function parseChordToken(token: string): Chord {
  const m = token.match(/^([b#♭♯]?)([1-7])(.*)$/);
  if (!m) throw new Error(`Can't read chord "${token}" — expected like 1, 5, 6m, b7, 4maj7`);
  const [, acc, degree, rest] = m;
  const quality = QUALITY_TOKENS[rest];
  if (quality === undefined)
    throw new Error(`Unknown chord quality "${rest}" in "${token}" — try m, 7, maj7, m7, dim, sus4`);
  const chord: Chord = { degree: Number(degree), quality };
  if (acc === "b" || acc === "♭") chord.accidental = -1;
  if (acc === "#" || acc === "♯") chord.accidental = 1;
  return chord;
}

// One section line → array of bars (each bar = chords).
export function parseSectionLine(line: string): Chord[][] {
  const bars = line
    .split("|")
    .map((b) => b.trim())
    .filter((b) => b.length > 0);
  if (bars.length === 0) throw new Error("Section has no bars");
  return bars.map((bar) => {
    const chords = bar.split(/\s+/).map(parseChordToken);
    if (chords.length > 1) {
      const beats = 4 / chords.length; // assumes 4/4 for split bars — fine for the prototype
      for (const c of chords) c.beats = beats;
    }
    return chords;
  });
}

// Build the sections+measures of a Chart doc from editor rows.
export function buildFromEditor(
  rows: { name: string; bars: string }[]
): { sections: Section[]; measures: Measure[] } {
  const sections: Section[] = [];
  const measures: Measure[] = [];
  let index = 0;
  for (const row of rows) {
    const name = row.name.trim() || "Section";
    let parsed: Chord[][];
    try {
      parsed = parseSectionLine(row.bars);
    } catch (e) {
      throw new Error(`${name}: ${(e as Error).message}`);
    }
    const start = index;
    for (const chords of parsed) measures.push({ index: index++, chords });
    sections.push({ name, start, end: index - 1 });
  }
  if (measures.length === 0) throw new Error("Chart has no measures");
  return { sections, measures };
}

// --- Serialization back to shorthand (for loading a chart into the editor) ---

export function chordToToken(c: Chord): string {
  const acc = c.accidental === -1 ? "b" : c.accidental === 1 ? "#" : "";
  return acc + c.degree + QUALITY_OUT[c.quality];
}

export function barToToken(m: Measure): string {
  return m.chords.map(chordToToken).join(" ");
}

// The shorthand line for one section of an existing doc.
export function sectionToLine(doc: Chart, s: Section): string {
  return doc.measures
    .filter((m) => m.index >= s.start && m.index <= s.end)
    .map(barToToken)
    .join(" | ");
}
