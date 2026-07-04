// The canonical chart model.
//
// Design principle: the chart stores music in a KEY-INDEPENDENT form.
// A chord is a scale degree (Nashville number), not a concrete pitch. The
// "which key to display in" choice lives at render time, so transposition is
// just re-rendering the same data — never a mutation of the stored chart.

export type Quality = "maj" | "min" | "7" | "maj7" | "m7" | "dim" | "sus4";

// A single chord as a scale degree relative to the key.
//   degree:     1..7 (the Nashville number)
//   accidental: -1 = flat, 0 = natural, +1 = sharp  (e.g. b3, #4)
//   beats:      how much of the measure it occupies (default = whole bar)
export interface Chord {
  degree: number;
  accidental?: -1 | 0 | 1;
  quality: Quality;
  beats?: number;
}

// One measure = a column in the grid. Holds the base (Nashville) layer.
export interface Measure {
  index: number; // global position, 0-based
  chords: Chord[];
}

// A named span of measures (Verse, Chorus…). start/end are inclusive global indices.
export interface Section {
  name: string;
  start: number;
  end: number;
}

// A rich snippet layered OVER a span of measures (a hook lick, a melody phrase).
// Absolute by nature (real frets / real pitches), so in this prototype it is
// pinned to the chart's written key rather than transposed.
export interface Insert {
  label: string;
  type: "tab" | "notation";
  start: number; // inclusive global measure index
  end: number; // inclusive global measure index
  lines: string[]; // monospace rows (tab strings, or a text sketch of notation)
}

// Instructions / notes layered over the grid.
//   span  -> covers start..end   ("Build", "half-time feel")
//   point -> pinned at `at`      ("push", a fermata)
export interface Annotation {
  kind: "span" | "point";
  text: string;
  start?: number;
  end?: number;
  at?: number;
}

export interface Chart {
  title: string;
  writtenKey: string; // the key the inserts were notated in
  timeSignature: string;
  sections: Section[];
  measures: Measure[];
  inserts: Insert[];
  annotations: Annotation[];
}
