import type { Annotation, Chart, Chord, Insert, Measure } from "./types";

// Pure document transforms for the WYSIWYG editor.
//
// Measures are addressed by global index; sections, inserts, and annotations
// all reference those indices, so every structural change must remap them
// consistently. That remapping lives here — components never touch indices.

function renumber(measures: Measure[]): Measure[] {
  return measures.map((m, i) => ({ ...m, index: i }));
}

// --- chord edits -------------------------------------------------------------

export function setMeasureChords(doc: Chart, index: number, chords: Chord[]): Chart {
  return {
    ...doc,
    measures: doc.measures.map((m) => (m.index === index ? { ...m, chords } : m)),
  };
}

// --- inserting measures -------------------------------------------------------

// Insert one measure AFTER global index `at`. The new bar joins `at`'s section;
// spans (sections/inserts/annotations) containing the insertion point stretch,
// everything later shifts right.
export function insertMeasureAfter(doc: Chart, at: number, chords: Chord[]): Chart {
  const p = at + 1; // index the new measure will occupy
  const measures = [...doc.measures.map((m) => ({ ...m }))];
  measures.splice(p, 0, { index: 0, chords });

  const shiftSpan = <T extends { start: number; end: number }>(s: T): T => {
    if (p <= s.start) return { ...s, start: s.start + 1, end: s.end + 1 };
    if (p <= s.end) return { ...s, end: s.end + 1 };
    return s;
  };

  return {
    ...doc,
    measures: renumber(measures),
    sections: doc.sections.map((s) => {
      if (at >= s.start && at <= s.end) return { ...s, end: s.end + 1 }; // owns the new bar
      if (p <= s.start) return { ...s, start: s.start + 1, end: s.end + 1 };
      return s;
    }),
    inserts: doc.inserts.map(shiftSpan),
    annotations: doc.annotations.map((a): Annotation => {
      if (a.kind === "point") return { ...a, at: a.at! >= p ? a.at! + 1 : a.at };
      const { start, end } = shiftSpan({ start: a.start!, end: a.end! });
      return { ...a, start, end };
    }),
  };
}

// --- deleting measures --------------------------------------------------------

// Delete global indices [s, e]. Returns null if that would leave no measures
// (or no sections). Spans shrink; fully-deleted spans/sections/points drop.
export function deleteRange(doc: Chart, s: number, e: number): Chart | null {
  const n = e - s + 1;
  if (doc.measures.length - n < 1) return null;

  const clampSpan = <T extends { start: number; end: number }>(sp: T): T | null => {
    const start = sp.start < s ? sp.start : sp.start > e ? sp.start - n : s;
    const end = sp.end < s ? sp.end : sp.end > e ? sp.end - n : s - 1;
    return end >= start ? { ...sp, start, end } : null;
  };

  const sections = doc.sections
    .map(clampSpan)
    .filter((x): x is NonNullable<typeof x> => x !== null);
  if (sections.length === 0) return null;

  return {
    ...doc,
    measures: renumber(doc.measures.filter((m) => m.index < s || m.index > e)),
    sections,
    inserts: doc.inserts
      .map(clampSpan)
      .filter((x): x is Insert => x !== null),
    annotations: doc.annotations.flatMap((a): Annotation[] => {
      if (a.kind === "point") {
        if (a.at! >= s && a.at! <= e) return []; // its bar is gone
        return [{ ...a, at: a.at! > e ? a.at! - n : a.at }];
      }
      const span = clampSpan({ start: a.start!, end: a.end! });
      return span ? [{ ...a, start: span.start, end: span.end }] : [];
    }),
  };
}

// --- sections ------------------------------------------------------------------

export function renameSection(doc: Chart, si: number, name: string): Chart {
  return {
    ...doc,
    sections: doc.sections.map((s, i) => (i === si ? { ...s, name } : s)),
  };
}

// Append a new section (with its bars) at the end of the chart.
export function appendSection(doc: Chart, name: string, bars: Chord[][]): Chart {
  const start = doc.measures.length;
  const measures = [
    ...doc.measures,
    ...bars.map((chords) => ({ index: 0, chords })),
  ];
  return {
    ...doc,
    measures: renumber(measures),
    sections: [...doc.sections, { name, start, end: start + bars.length - 1 }],
  };
}

// --- annotations -----------------------------------------------------------------

export function addAnnotation(doc: Chart, a: Annotation): Chart {
  return { ...doc, annotations: [...doc.annotations, a] };
}

export function updateAnnotation(doc: Chart, i: number, patch: Partial<Annotation>): Chart {
  return {
    ...doc,
    annotations: doc.annotations.map((a, j) => (j === i ? { ...a, ...patch } : a)),
  };
}

export function deleteAnnotation(doc: Chart, i: number): Chart {
  return { ...doc, annotations: doc.annotations.filter((_, j) => j !== i) };
}

// --- inserts ----------------------------------------------------------------------

// A blank guitar-tab grid spanning `bars` measures.
export function defaultTabLines(bars: number): string[] {
  return ["e", "B", "G", "D", "A", "E"].map(
    (s) => `${s}|${("-".repeat(8) + "|").repeat(bars)}`
  );
}

export function addInsert(doc: Chart, ins: Insert): Chart {
  return { ...doc, inserts: [...doc.inserts, ins] };
}

export function updateInsert(doc: Chart, i: number, patch: Partial<Insert>): Chart {
  return {
    ...doc,
    inserts: doc.inserts.map((ins, j) => (j === i ? { ...ins, ...patch } : ins)),
  };
}

export function deleteInsert(doc: Chart, i: number): Chart {
  return { ...doc, inserts: doc.inserts.filter((_, j) => j !== i) };
}
