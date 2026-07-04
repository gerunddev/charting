import type { Chord, Quality } from "./types";

// Pitch-class spelling. Sharp keys spell with sharps, flat keys with flats.
const SHARP = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const FLAT = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

const KEY_PC: Record<string, number> = {
  C: 0, "C#": 1, Db: 1, D: 2, Eb: 3, E: 4, F: 5,
  "F#": 6, Gb: 6, G: 7, Ab: 8, A: 9, Bb: 10, B: 11,
};

// Keys conventionally notated with flats.
const FLAT_KEYS = new Set(["F", "Bb", "Eb", "Ab", "Db", "Gb"]);

// Semitone offset of each major-scale degree from the tonic.
const MAJOR = [0, 2, 4, 5, 7, 9, 11];

// The 12 keys we let the user transpose into.
export const KEYS = ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];

// A rendered chord splits into three pieces so extensions can be superscripted:
//   base:   the note/number + accidental (e.g. "5", "B♭")
//   inline: quality that stays on the baseline (e.g. "m", "sus4")
//   sup:    modifiers shown superscript (e.g. "7", "maj7", "°")
export interface ChordParts {
  base: string;
  inline: string;
  sup: string;
}

// Split a chord quality into its inline vs. superscript parts.
function qualityParts(q: Quality): { inline: string; sup: string } {
  switch (q) {
    case "maj": return { inline: "", sup: "" };
    case "min": return { inline: "m", sup: "" };
    case "7": return { inline: "", sup: "7" };
    case "maj7": return { inline: "", sup: "maj7" };
    case "m7": return { inline: "m", sup: "7" };
    case "dim": return { inline: "", sup: "°" };
    case "sus4": return { inline: "sus4", sup: "" };
  }
}

function accidentalMark(a: number | undefined): string {
  if (a === -1) return "♭"; // flat
  if (a === 1) return "♯"; // sharp
  return "";
}

// The key-independent Nashville label — the base NEVER changes when you transpose.
export function nashvilleParts(chord: Chord): ChordParts {
  return { base: accidentalMark(chord.accidental) + chord.degree, ...qualityParts(chord.quality) };
}

// The concrete chord for a given display key — the base DOES change.
export function chordParts(chord: Chord, key: string): ChordParts {
  const pc = (KEY_PC[key] + MAJOR[chord.degree - 1] + (chord.accidental ?? 0) + 120) % 12;
  const names = FLAT_KEYS.has(key) ? FLAT : SHARP;
  return { base: names[pc], ...qualityParts(chord.quality) };
}
