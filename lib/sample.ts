import type { Chart } from "./types";

// A sample song stored entirely in Nashville (key-independent) form.
// Written key is G — that's the key the tab insert was notated in.
const m = (index: number, chords: Chart["measures"][number]["chords"]) => ({ index, chords });

export const sampleChart: Chart = {
  title: "Untitled Hook",
  writtenKey: "G",
  timeSignature: "4/4",
  sections: [
    { name: "Verse", start: 0, end: 7 },
    { name: "Chorus", start: 8, end: 15 },
  ],
  measures: [
    // Verse: 1  5  6m  4   x2
    m(0, [{ degree: 1, quality: "maj" }]),
    m(1, [{ degree: 5, quality: "maj" }]),
    m(2, [{ degree: 6, quality: "min" }]),
    m(3, [{ degree: 4, quality: "maj" }]),
    m(4, [{ degree: 1, quality: "maj" }]),
    m(5, [{ degree: 5, quality: "maj" }]),
    // the "hook" bars — a lick lives here as an insert
    m(6, [{ degree: 4, quality: "maj", beats: 2 }, { degree: 5, quality: "maj", beats: 2 }]),
    m(7, [{ degree: 1, quality: "maj" }]),
    // Chorus: 4  1  5  6m  4  1  5  5
    m(8, [{ degree: 4, quality: "maj" }]),
    m(9, [{ degree: 1, quality: "maj" }]),
    m(10, [{ degree: 5, quality: "maj" }]),
    m(11, [{ degree: 6, quality: "min" }]),
    m(12, [{ degree: 4, quality: "maj" }]),
    m(13, [{ degree: 1, quality: "maj" }]),
    m(14, [{ degree: 5, quality: "7" }]),
    m(15, [{ degree: 5, quality: "7" }]),
  ],
  inserts: [
    {
      label: "Hook lick",
      type: "tab",
      start: 6,
      end: 7,
      lines: [
        "e|-----------------|---------------|",
        "B|-----------------|---------------|",
        "G|-----0-2-4-------|-4-2-0---------|",
        "D|-3-5-------5-3---|-------5-3-----|",
        "A|-----------------|-----------3---|",
        "E|-----------------|---------------|",
      ],
    },
  ],
  annotations: [
    { kind: "span", text: "Build", start: 8, end: 15 },
    { kind: "point", text: "push", at: 8 },
    { kind: "point", text: "hold", at: 15 },
  ],
};
