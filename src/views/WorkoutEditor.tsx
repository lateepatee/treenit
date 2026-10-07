import { useEffect, useMemo, useState } from 'react';
import {
  clearDraft,
  draftFromWorkout,
  emptyDraft,
  emptyExercise,
  emptySet,
  loadDraft,
  saveDraft,
  type Draft,
  type DraftExercise,
  type DraftSet,
} from '../draft';
import { useStore } from '../store';
import type { AppData, SetEntry } from '../types';
import { fmtDate, fmtNum, fmtSigned, numToInput, parseNum, summarizeSets, uid } from '../utils';

interface Props {
  workoutId: string | null;
  /** Uuden treenin lähtötilanne (pohja tai vanha treeni) */
  start?: Draft;
  onClose: () => void;
}

interface PreviousSession {
  date: string;
  sets: SetEntry[];
}

function previousSession(data: AppData, name: string, beforeOrOn: string, excludeId: string | null): PreviousSession | null {
  const n = name.trim().toLowerCase();
  const ex = n && data.exercises.find((e) => e.name.toLowerCase() === n);
  if (!ex) return null;
  let best: PreviousSession | null = null;
  for (const w of data.workouts) {
    if (w.id === excludeId || w.date > beforeOrOn) continue;
    const sets = w.exercises.filter((e) => e.exerciseId === ex.id).flatMap((e) => e.sets);
    if (sets.length && (!best || w.date > best.date)) best = { date: w.date, sets };
  }
  return best;
}

/** Sarjan tulos. Tyhjä paino tarkoittaa samaa kuin edellisellä kerralla (näkyy kentässä harmaana). */
function setResult(s: DraftSet, prev: SetEntry | undefined): SetEntry | null {
  const reps = Math.round(parseNum(s.reps) ?? 0);
  if (reps <= 0) return null;
  const typed = parseNum(s.weight);
  return { weight: Math.max(0, typed ?? prev?.weight ?? 0), reps };
}

/** Vertailu edelliskertaan: painavampi paino tai samalla painolla enemmän toistoja on parannus. */
function compareSet(cur: SetEntry, prev: SetEntry): { dir: 'up' | 'same' | 'down'; text: string } {
  const dw = cur.weight - prev.weight;
  if (Math.abs(dw) > 1e-9) return { dir: dw > 0 ? 'up' : 'down', text: `${fmtSigned(dw, 2)} kg` };
  const dr = cur.reps - prev.reps;
  return { dir: dr > 0 ? 'up' : dr < 0 ? 'down' : 'same', text: dr === 0 ? '=' : fmtSigned(dr, 0) };
}

/** Koko liikkeen vertailu: kovin paino, ja saman painon sarjoissa toistojen summa. */
function compareExercise(pairs: { cur: SetEntry; prev: SetEntry }[]): { dir: 'up' | 'same' | 'down'; text: string } | null {
  if (pairs.length === 0) return null;
  const dw = Math.max(...pairs.map((p) => p.cur.weight)) - Math.max(...pairs.map((p) => p.prev.weight));
  if (Math.abs(dw) > 1e-9) return { dir: dw > 0 ? 'up' : 'down', text: `${fmtSigned(dw, 2)} kg` };
  const dr = pairs.reduce((a, p) => a + p.cur.reps - p.prev.reps, 0);
  if (dr === 0) return { dir: 'same', text: 'samat toistot' };
  return { dir: dr > 0 ? 'up' : 'down', text: `${fmtSigned(dr, 0)} ${Math.abs(dr) === 1 ? 'toisto' : 'toistoa'}` };
}

const ARROW = { up: '▲', same: '', down: '▼' } as const;

export function WorkoutEditor({ workoutId, start, onClose }: Props) {
  const { data, saveWorkout, deleteWorkout } = useStore();

  const [init] = useState(() => {
    if (start) return { draft: start, dirty: true };
    const saved = loadDraft();
    if (saved && saved.workoutId === workoutId) return { draft: saved, dirty: true };
    const existing = workoutId ? data.workouts.find((w) => w.id === workoutId) : undefined;
    return { draft: existing ? draftFromWorkout(existing, data, false) : emptyDraft(), dirty: false };
  });
  const [draft, setDraft] = useState<Draft>(init.draft);
  const [dirty, setDirty] = useState(init.dirty);

  // Keskeneräinen treeni säilyy, vaikka selain suljettaisiin kesken salikäynnin.
  useEffect(() => {
    if (dirty) saveDraft(draft);
  }, [draft, dirty]);

  const update = (fn: (d: Draft) => Draft) => {
    setDraft(fn);
    setDirty(true);
  };
  const updateExercise = (id: string, fn: (e: DraftExercise) => DraftExercise) =>
    update((d) => ({ ...d, exercises: d.exercises.map((e) => (e.id === id ? fn(e) : e)) }));

  const exerciseNames = useMemo(
    () => [...data.exercises].map((e) => e.name).sort((a, b) => a.localeCompare(b, 'fi')),
    [data.exercises],
  );

  const handleSave = () => {
    const exercises = draft.exercises
      .map((e) => {
        const prev = previousSession(data, e.name, draft.date, draft.workoutId);
        return {
          name: e.name.trim(),
          sets: e.sets.map((s, i) => setResult(s, prev?.sets[i])).filter((s): s is SetEntry => s !== null),
        };
      })
      .filter((e) => e.name && e.sets.length > 0);
    const unnamed = draft.exercises.some((e) => !e.name.trim() && e.sets.some((s) => parseNum(s.reps)));
    if (unnamed) {
      alert('Anna jokaiselle liikkeelle nimi.');
      return;
    }
    if (exercises.length === 0) {
      alert('Lisää vähintään yksi liike ja sarja, jossa on toistot.');
      return;
    }
    saveWorkout({ id: draft.workoutId, date: draft.date, name: draft.name, notes: draft.notes, exercises });
    clearDraft();
    onClose();
  };

  const handleCancel = () => {
    if (dirty && !confirm('Hylätäänkö tallentamattomat muutokset?')) return;
    clearDraft();
    onClose();
  };

  const handleDelete = () => {
    if (!draft.workoutId || !confirm('Poistetaanko treeni pysyvästi?')) return;
    deleteWorkout(draft.workoutId);
    clearDraft();
    onClose();
  };

  return (
    <div className="editor">
      <div className="view-header">
        <h1>{draft.workoutId ? 'Muokkaa treeniä' : 'Uusi treeni'}</h1>
        <div className="row-gap">
          <button type="button" className="btn ghost" onClick={handleCancel}>
            Peruuta
          </button>
          <button type="button" className="btn primary" onClick={handleSave}>
            Tallenna
          </button>
        </div>
      </div>

      <div className="card form-grid">
        <label className="field">
          <span>Päivä</span>
          <input type="date" value={draft.date} onChange={(e) => update((d) => ({ ...d, date: e.target.value }))} />
        </label>
        <label className="field">
          <span>Nimi (valinnainen)</span>
          <input
            type="text"
            placeholder="esim. Jalkapäivä"
            value={draft.name}
            onChange={(e) => update((d) => ({ ...d, name: e.target.value }))}
          />
        </label>
      </div>

      <datalist id="exercise-names">
        {exerciseNames.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>

      {draft.exercises.map((ex, idx) => {
        const prev = previousSession(data, ex.name, draft.date, draft.workoutId);
        const allEmpty = ex.sets.every((s) => !s.weight && !s.reps);
        const pairs = prev
          ? ex.sets.flatMap((s, i) => {
              const p = prev.sets[i];
              const cur = p && setResult(s, p);
              return cur ? [{ cur, prev: p }] : [];
            })
          : [];
        const total = compareExercise(pairs);
        return (
          <div key={ex.id} className="card exercise-card">
            <div className="exercise-head">
              <input
                className="exercise-name"
                type="text"
                list="exercise-names"
                placeholder={`Liike ${idx + 1}, esim. Kyykky`}
                aria-label="Liikkeen nimi"
                value={ex.name}
                onChange={(e) => updateExercise(ex.id, (x) => ({ ...x, name: e.target.value }))}
              />
              <button
                type="button"
                className="icon-btn"
                aria-label="Poista liike"
                title="Poista liike"
                onClick={() => update((d) => ({ ...d, exercises: d.exercises.filter((x) => x.id !== ex.id) }))}
              >
                ✕
              </button>
            </div>

            {prev && (
              <div className="prev-hint">
                <span>
                  Edellinen ({fmtDate(prev.date, { year: false })}): {summarizeSets(prev.sets)}
                </span>
                {total && (
                  <span className={`cmp cmp-${total.dir}`}>
                    Nyt: {ARROW[total.dir] && <span aria-hidden="true">{ARROW[total.dir]} </span>}
                    {total.text}
                  </span>
                )}
                {allEmpty && (
                  <button
                    type="button"
                    className="link-btn"
                    onClick={() =>
                      updateExercise(ex.id, (x) => ({
                        ...x,
                        sets: prev.sets.map((s) => ({
                          id: uid(),
                          weight: numToInput(s.weight),
                          reps: String(s.reps),
                        })),
                      }))
                    }
                  >
                    Kopioi sarjat
                  </button>
                )}
              </div>
            )}

            <div className="sets">
              <div className="set-row set-header" aria-hidden="true">
                <span>#</span>
                <span>kg</span>
                <span>toistot</span>
                <span>{prev ? 'vrt.' : ''}</span>
                <span />
              </div>
              {ex.sets.map((s, i) => {
                const p = prev?.sets[i];
                const cur = p && setResult(s, p);
                const cmp = cur && p ? compareSet(cur, p) : null;
                return (
                  <div key={s.id} className="set-row">
                    <span className="set-num">{i + 1}</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder={p ? fmtNum(p.weight, 2) : '0'}
                      aria-label={`Sarja ${i + 1} paino kg`}
                      value={s.weight}
                      onChange={(e) =>
                        updateExercise(ex.id, (x) => ({
                          ...x,
                          sets: x.sets.map((y) => (y.id === s.id ? { ...y, weight: e.target.value } : y)),
                        }))
                      }
                    />
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder={p ? String(p.reps) : '–'}
                      aria-label={`Sarja ${i + 1} toistot`}
                      value={s.reps}
                      onChange={(e) =>
                        updateExercise(ex.id, (x) => ({
                          ...x,
                          sets: x.sets.map((y) => (y.id === s.id ? { ...y, reps: e.target.value } : y)),
                        }))
                      }
                    />
                    <span
                      className={cmp ? `cmp cmp-${cmp.dir}` : 'cmp'}
                      aria-label={cmp ? `Edelliseen verrattuna ${cmp.text}` : undefined}
                    >
                      {cmp && (
                        <>
                          {ARROW[cmp.dir] && <span aria-hidden="true">{ARROW[cmp.dir]}</span>}
                          {cmp.text}
                        </>
                      )}
                    </span>
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label={`Poista sarja ${i + 1}`}
                      onClick={() => updateExercise(ex.id, (x) => ({ ...x, sets: x.sets.filter((y) => y.id !== s.id) }))}
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
            <button
              type="button"
              className="btn subtle small"
              onClick={() =>
                updateExercise(ex.id, (x) => {
                  const last = x.sets[x.sets.length - 1];
                  return { ...x, sets: [...x.sets, last ? { ...last, id: uid() } : emptySet()] };
                })
              }
            >
              + Sarja
            </button>
          </div>
        );
      })}

      <button
        type="button"
        className="btn subtle wide"
        onClick={() => update((d) => ({ ...d, exercises: [...d.exercises, emptyExercise()] }))}
      >
        + Lisää liike
      </button>

      <div className="card">
        <label className="field">
          <span>Muistiinpanot</span>
          <textarea
            rows={3}
            placeholder="Fiilis, nukutut tunnit, kivut…"
            value={draft.notes}
            onChange={(e) => update((d) => ({ ...d, notes: e.target.value }))}
          />
        </label>
      </div>

      <div className="editor-footer">
        {draft.workoutId && (
          <button type="button" className="btn danger" onClick={handleDelete}>
            Poista treeni
          </button>
        )}
        <span className="spacer" />
        <button type="button" className="btn primary" onClick={handleSave}>
          Tallenna treeni
        </button>
      </div>

      <blockquote className="motto">
        If you look in the mirror while lifting and your expression looks like you are taking an angry shit, you are
        probably training hard enough.
      </blockquote>
    </div>
  );
}
