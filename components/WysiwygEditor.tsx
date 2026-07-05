"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { KEYS, chordParts, nashvilleParts, type ChordParts } from "@/lib/music";
import {
  addAnnotation,
  addInsert,
  appendSection,
  defaultTabLines,
  deleteAnnotation,
  deleteInsert,
  deleteRange,
  insertMeasureAfter,
  renameSection,
  setMeasureChords,
  updateAnnotation,
  updateInsert,
} from "@/lib/editing";
import { barToToken, parseBar } from "@/lib/shorthand";
import type { Chart, ChartRecord, Section } from "@/lib/types";

const PER_LINE = 4;
type Mode = "nashville" | "keys";

interface Snap {
  doc: Chart;
  tags: string[];
}

// WYSIWYG chart editor: the rendered chart IS the editing surface.
// Click a bar to select, double-click/Enter/type to edit, shift-click for a
// range; the context bar offers notes/inserts/bar ops on the selection.
// Autosaves (debounced) with undo/redo.
export default function WysiwygEditor({ record }: { record: ChartRecord }) {
  const [doc, setDoc] = useState(record.doc);
  const [tags, setTags] = useState(record.tags);
  const [past, setPast] = useState<Snap[]>([]);
  const [future, setFuture] = useState<Snap[]>([]);
  const [version, setVersion] = useState(0); // bumps on every committed change

  // view state (not saved)
  const [mode, setMode] = useState<Mode>("nashville");
  const [displayKey, setDisplayKey] = useState(record.doc.writtenKey);

  // selection + inline bar editing (global measure indices)
  const [sel, setSel] = useState<{ a: number; h: number } | null>(null);
  const [edit, setEdit] = useState<{ i: number; text: string } | null>(null);

  const [saveState, setSaveState] = useState<"saved" | "dirty" | "saving" | "error">("saved");

  // --- history + commit ------------------------------------------------------

  const commit = useCallback(
    (nextDoc: Chart | null, nextTags?: string[]) => {
      if (nextDoc === null && nextTags === undefined) return;
      setPast((p) => [...p.slice(-99), { doc, tags }]);
      setFuture([]);
      if (nextDoc) setDoc(nextDoc);
      if (nextTags) setTags(nextTags);
      setVersion((v) => v + 1);
    },
    [doc, tags]
  );

  const undo = useCallback(() => {
    setPast((p) => {
      if (p.length === 0) return p;
      const prev = p[p.length - 1];
      setFuture((f) => [...f, { doc, tags }]);
      setDoc(prev.doc);
      setTags(prev.tags);
      setVersion((v) => v + 1);
      return p.slice(0, -1);
    });
    setSel(null);
    setEdit(null);
  }, [doc, tags]);

  const redo = useCallback(() => {
    setFuture((f) => {
      if (f.length === 0) return f;
      const next = f[f.length - 1];
      setPast((p) => [...p, { doc, tags }]);
      setDoc(next.doc);
      setTags(next.tags);
      setVersion((v) => v + 1);
      return f.slice(0, -1);
    });
    setSel(null);
    setEdit(null);
  }, [doc, tags]);

  // --- autosave ----------------------------------------------------------------

  const saveNow = useCallback(async () => {
    setSaveState("saving");
    const res = await fetch(`/api/charts/${record.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ doc, tags }),
    }).catch(() => null);
    setSaveState(res?.ok ? "saved" : "error");
  }, [doc, tags, record.id]);

  useEffect(() => {
    if (version === 0) return;
    setSaveState("dirty");
    const t = setTimeout(saveNow, 800);
    return () => clearTimeout(t);
  }, [version, saveNow]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (saveState !== "saved") e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [saveState]);

  // --- bar editing --------------------------------------------------------------

  const startEdit = useCallback(
    (i: number, initial?: string) => {
      const m = doc.measures[i];
      if (!m) return;
      setSel({ a: i, h: i });
      setEdit({ i, text: initial ?? barToToken(m) });
    },
    [doc]
  );

  // Commit the draft. Returns the updated doc, or null if the draft is invalid.
  const commitEdit = useCallback((): Chart | null => {
    if (!edit) return doc;
    let next: Chart;
    try {
      next = setMeasureChords(doc, edit.i, parseBar(edit.text));
    } catch {
      return null;
    }
    commit(next);
    return next;
  }, [edit, doc, commit]);

  const editValid = useMemo(() => {
    if (!edit) return true;
    try {
      parseBar(edit.text);
      return true;
    } catch {
      return false;
    }
  }, [edit]);

  // --- selection actions ----------------------------------------------------------

  const range = sel ? { s: Math.min(sel.a, sel.h), e: Math.max(sel.a, sel.h) } : null;

  function addBarAfter(i: number) {
    const src = doc.measures[i];
    const next = insertMeasureAfter(doc, i, src.chords.map((c) => ({ ...c })));
    commit(next);
    setSel({ a: i + 1, h: i + 1 });
  }

  function deleteSelection() {
    if (!range) return;
    const next = deleteRange(doc, range.s, range.e);
    if (!next) return; // refuse to empty the chart
    commit(next);
    setSel(null);
    setEdit(null);
  }

  function addNote() {
    if (!range) return;
    const next =
      range.s === range.e
        ? addAnnotation(doc, { kind: "point", text: "note", at: range.s })
        : addAnnotation(doc, { kind: "span", text: "label", start: range.s, end: range.e });
    commit(next);
  }

  function addTab() {
    if (!range) return;
    commit(
      addInsert(doc, {
        label: "Insert",
        type: "tab",
        start: range.s,
        end: range.e,
        lines: defaultTabLines(range.e - range.s + 1),
      })
    );
  }

  // --- global keyboard -----------------------------------------------------------

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement;
      const inField = ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName);
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveNow();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z" && !inField) {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (inField || edit) return; // bar-input handles its own keys
      if (!sel) return;
      if (e.key === "Enter") {
        e.preventDefault();
        startEdit(sel.h);
      } else if (e.key === "Backspace" || e.key === "Delete") {
        e.preventDefault();
        deleteSelection();
      } else if (e.key === "Escape") {
        setSel(null);
      } else if (/^[1-7b#]$/.test(e.key) && sel.a === sel.h) {
        e.preventDefault();
        startEdit(sel.h, e.key); // start typing straight into the bar
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel, edit, doc, undo, redo, saveNow, startEdit]);

  // --- render -----------------------------------------------------------------------

  const saveLabel = {
    saved: "Saved ✓",
    dirty: "Unsaved…",
    saving: "Saving…",
    error: "Save failed — press ⌘S to retry",
  }[saveState];

  return (
    <div className="weditor">
      {/* meta bar: title / key / time / tags, all inline */}
      <div className="editrow metabar" key={`meta-${version}`}>
        <input
          className="titleinput"
          defaultValue={doc.title}
          placeholder="Untitled chart"
          onBlur={(e) => {
            if (e.target.value !== doc.title) commit({ ...doc, title: e.target.value });
          }}
        />
        <label>
          Written key
          <select
            defaultValue={doc.writtenKey}
            onChange={(e) => commit({ ...doc, writtenKey: e.target.value })}
          >
            {KEYS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </label>
        <label>
          Time
          <input
            defaultValue={doc.timeSignature}
            size={4}
            onBlur={(e) => {
              if (e.target.value !== doc.timeSignature)
                commit({ ...doc, timeSignature: e.target.value });
            }}
          />
        </label>
        <TagEditor tags={tags} onChange={(t) => commit(null, t)} />
      </div>

      {/* context bar: view controls + selection actions + save state */}
      <div className="toolbar ctxbar">
        <div className="seg">
          <button className={mode === "nashville" ? "active" : ""} onClick={() => setMode("nashville")}>
            Nashville
          </button>
          <button className={mode === "keys" ? "active" : ""} onClick={() => setMode("keys")}>
            Keys
          </button>
        </div>
        {mode === "keys" && (
          <select value={displayKey} onChange={(e) => setDisplayKey(e.target.value)}>
            {KEYS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        )}
        <span className="navspacer" />
        {range && (
          <>
            <span className="selinfo">
              {range.s === range.e ? `bar ${range.s + 1}` : `bars ${range.s + 1}–${range.e + 1}`}
            </span>
            <button onClick={addNote}>{range.s === range.e ? "+ Note" : "+ Label"}</button>
            <button onClick={addTab}>+ Tab</button>
            <button onClick={() => addBarAfter(range.e)}>+ Bar after</button>
            <button className="danger" onClick={deleteSelection}>
              Delete
            </button>
          </>
        )}
        <span className="navspacer" />
        <button onClick={undo} disabled={past.length === 0} title="⌘Z">
          ↩︎
        </button>
        <button onClick={redo} disabled={future.length === 0} title="⇧⌘Z">
          ↪︎
        </button>
        <span className={`savestate ${saveState}`}>{saveLabel}</span>
      </div>

      <p className="hint">
        Click a bar to select · double-click, Enter, or just type to edit · shift-click for a range
        · Tab walks bars · ⌘Z undo. Chords: <code>1</code> <code>6m</code> <code>b7</code>{" "}
        <code>4maj7</code>, split a bar with spaces: <code>1 4</code>.
      </p>

      {doc.sections.map((sec, si) => (
        <SectionBlock
          key={si}
          doc={doc}
          sec={sec}
          si={si}
          version={version}
          mode={mode}
          displayKey={displayKey}
          sel={sel}
          setSel={setSel}
          edit={edit}
          setEdit={setEdit}
          editValid={editValid}
          commitEdit={commitEdit}
          startEdit={startEdit}
          commit={commit}
          addBarAfter={addBarAfter}
        />
      ))}

      <button
        className="addsection"
        onClick={() =>
          commit(
            appendSection(
              doc,
              "Section",
              [1, 4, 1, 5].map((degree) => [{ degree, quality: "maj" as const }])
            )
          )
        }
      >
        + Add section
      </button>
    </div>
  );
}

// --- pieces ---------------------------------------------------------------------

function ChordText({ parts }: { parts: ChordParts }) {
  return (
    <span>
      {parts.base}
      {parts.inline}
      {parts.sup && <sup>{parts.sup}</sup>}
    </span>
  );
}

function TagEditor({ tags, onChange }: { tags: string[]; onChange: (t: string[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);

  function addFromInput() {
    const v = inputRef.current?.value.trim().toLowerCase();
    if (!v) return;
    if (!tags.includes(v)) onChange([...tags, v]);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="tagedit">
      {tags.map((t) => (
        <span className="tag" key={t}>
          {t}
          <button onClick={() => onChange(tags.filter((x) => x !== t))} aria-label={`remove ${t}`}>
            ✕
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        placeholder="+ tag"
        onBlur={addFromInput}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            addFromInput();
          }
        }}
      />
    </div>
  );
}

interface SectionProps {
  doc: Chart;
  sec: Section;
  si: number;
  version: number;
  mode: Mode;
  displayKey: string;
  sel: { a: number; h: number } | null;
  setSel: (s: { a: number; h: number } | null) => void;
  edit: { i: number; text: string } | null;
  setEdit: (e: { i: number; text: string } | null) => void;
  editValid: boolean;
  commitEdit: () => Chart | null;
  startEdit: (i: number, initial?: string) => void;
  commit: (doc: Chart | null, tags?: string[]) => void;
  addBarAfter: (i: number) => void;
}

function SectionBlock(p: SectionProps) {
  const { doc, sec, si } = p;

  // Chunk this section's bars (plus a trailing ghost "+" cell) into lines.
  const indices: (number | "add")[] = [];
  for (let i = sec.start; i <= sec.end; i++) indices.push(i);
  indices.push("add");
  const lines: (number | "add")[][] = [];
  for (let i = 0; i < indices.length; i += PER_LINE) lines.push(indices.slice(i, i + PER_LINE));

  return (
    <div className="section">
      <div className="sectionhead" key={`sh-${si}-${p.version}`}>
        <input
          className="sectionname"
          defaultValue={sec.name}
          onBlur={(e) => {
            if (e.target.value !== sec.name) p.commit(renameSection(doc, si, e.target.value));
          }}
        />
        <button
          className="danger"
          title="Delete section"
          onClick={() => {
            if (confirm(`Delete section "${sec.name}" and its bars?`)) {
              p.commit(deleteRange(doc, sec.start, sec.end));
              p.setSel(null);
            }
          }}
        >
          ✕
        </button>
      </div>
      {lines.map((line, li) => (
        <EditLine key={li} line={line} lineStart={line[0] === "add" ? sec.end + 1 : (line[0] as number)} {...p} />
      ))}
    </div>
  );
}

function EditLine(p: SectionProps & { line: (number | "add")[]; lineStart: number }) {
  const { doc, line, lineStart, sel, edit } = p;
  const lineEnd = lineStart + line.length - 1;
  const col = (gi: number) => gi - lineStart + 1;
  const range = sel ? { s: Math.min(sel.a, sel.h), e: Math.max(sel.a, sel.h) } : null;

  const inserts = doc.inserts
    .map((ins, idx) => ({ ins, idx }))
    .filter(({ ins }) => ins.start <= lineEnd && ins.end >= lineStart);
  const annotations = doc.annotations
    .map((a, idx) => ({ a, idx }))
    .filter(({ a }) => {
      const s = a.kind === "point" ? a.at! : a.start!;
      const e = a.kind === "point" ? a.at! : a.end!;
      return s <= lineEnd && e >= lineStart;
    });

  return (
    <div className="grid line" style={{ gridTemplateColumns: `repeat(${PER_LINE}, minmax(96px, 1fr))` }}>
      {line.map((item, li) => {
        if (item === "add") {
          // The ghost sits right after the section's last bar; append there.
          const prev = lineStart + li - 1;
          return (
            <button
              className="cell addcell"
              style={{ gridColumn: col(lineStart + li) }}
              key="add"
              title="Add bar"
              onClick={() => p.addBarAfter(Math.max(0, prev))}
            >
              +
            </button>
          );
        }
        const gi = item;
        const m = doc.measures[gi];
        const isSel = range && gi >= range.s && gi <= range.e;
        if (edit && edit.i === gi) {
          return (
            <div className={`cell editing ${p.editValid ? "" : "invalid"}`} style={{ gridColumn: col(gi) }} key={gi}>
              <input
                className="barinput"
                autoFocus
                value={edit.text}
                onChange={(e) => p.setEdit({ i: gi, text: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (p.commitEdit()) p.setEdit(null);
                  } else if (e.key === "Escape") {
                    e.preventDefault();
                    p.setEdit(null);
                  } else if (e.key === "Tab") {
                    e.preventDefault();
                    const next = p.commitEdit();
                    if (!next) return;
                    const ni = e.shiftKey ? gi - 1 : gi + 1;
                    if (ni >= 0 && ni < next.measures.length) {
                      p.setSel({ a: ni, h: ni });
                      p.setEdit({ i: ni, text: barToToken(next.measures[ni]) });
                    } else {
                      p.setEdit(null);
                    }
                  }
                }}
                onBlur={() => {
                  if (!p.commitEdit()) p.setEdit(null); // invalid → revert silently
                  else p.setEdit(null);
                }}
              />
              <span className="barnum">{gi + 1}</span>
            </div>
          );
        }
        return (
          <div
            className={`cell editable ${isSel ? "selected" : ""}`}
            style={{ gridColumn: col(gi) }}
            key={gi}
            onClick={(e) => {
              if (e.shiftKey && sel) p.setSel({ a: sel.a, h: gi });
              else p.setSel({ a: gi, h: gi });
            }}
            onDoubleClick={() => p.startEdit(gi)}
          >
            <div className="beats">
              {m.chords.map((c, i) => (
                <span className="nash" key={i}>
                  <ChordText parts={p.mode === "keys" ? chordParts(c, p.displayKey) : nashvilleParts(c)} />
                </span>
              ))}
            </div>
            <span className="barnum">{gi + 1}</span>
          </div>
        );
      })}

      {annotations.map(({ a, idx }) => {
        const isPoint = a.kind === "point";
        const s = Math.max(isPoint ? a.at! : a.start!, lineStart);
        const e = Math.min(isPoint ? a.at! : a.end!, lineEnd);
        return (
          <div
            className={isPoint ? "annot-point" : "annot-span"}
            style={{ gridColumn: isPoint ? col(s) : `${col(s)} / span ${e - s + 1}` }}
            key={`a${idx}`}
          >
            <input
              key={`at-${idx}-${p.version}`}
              defaultValue={a.text}
              size={Math.max(3, a.text.length)}
              onBlur={(ev) => {
                if (ev.target.value !== a.text)
                  p.commit(updateAnnotation(doc, idx, { text: ev.target.value }));
              }}
            />
            <button className="tiny danger" title="Delete" onClick={() => p.commit(deleteAnnotation(doc, idx))}>
              ✕
            </button>
          </div>
        );
      })}

      {inserts.map(({ ins, idx }) => {
        const s = Math.max(ins.start, lineStart);
        const e = Math.min(ins.end, lineEnd);
        return (
          <div className="insert" style={{ gridColumn: `${col(s)} / span ${e - s + 1}` }} key={`i${idx}`}>
            <div className="iheader" key={`ih-${idx}-${p.version}`}>
              <input
                className="ilabelinput"
                defaultValue={ins.label}
                onBlur={(ev) => {
                  if (ev.target.value !== ins.label)
                    p.commit(updateInsert(doc, idx, { label: ev.target.value }));
                }}
              />
              <select
                defaultValue={ins.type}
                onChange={(ev) => p.commit(updateInsert(doc, idx, { type: ev.target.value as "tab" | "notation" }))}
              >
                <option value="tab">tab</option>
                <option value="notation">notation</option>
              </select>
              <span className="pinned">bars {ins.start + 1}–{ins.end + 1} · pinned to {doc.writtenKey}</span>
              <button className="tiny danger" title="Delete insert" onClick={() => p.commit(deleteInsert(doc, idx))}>
                ✕
              </button>
            </div>
            <textarea
              key={`it-${idx}-${p.version}`}
              rows={ins.lines.length || 6}
              defaultValue={ins.lines.join("\n")}
              spellCheck={false}
              onBlur={(ev) => {
                const lines = ev.target.value.split("\n");
                if (lines.join("\n") !== ins.lines.join("\n"))
                  p.commit(updateInsert(doc, idx, { lines }));
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
