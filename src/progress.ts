import type { AppData, SetEntry, Workout } from './types';
import { fmtSigned } from './utils';

export type Dir = 'up' | 'same' | 'down';
export interface ExerciseCompare {
  dir: Dir;
  text: string;
}

export const ARROW = { up: '▲', same: '', down: '▼' } as const;

interface PreviousSession {
  date: string;
  sets: SetEntry[];
}

export function previousSession(data: AppData, name: string, beforeOrOn: string, excludeId: string | null): PreviousSession | null {
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

/** Vertailu edelliskertaan: painavampi paino tai samalla painolla enemmän toistoja on parannus. */
export function compareSet(cur: SetEntry, prev: SetEntry): ExerciseCompare {
  const dw = cur.weight - prev.weight;
  if (Math.abs(dw) > 1e-9) return { dir: dw > 0 ? 'up' : 'down', text: `${fmtSigned(dw, 2)} kg` };
  const dr = cur.reps - prev.reps;
  return { dir: dr > 0 ? 'up' : dr < 0 ? 'down' : 'same', text: dr === 0 ? '=' : fmtSigned(dr, 0) };
}

/** Koko liikkeen vertailu: kovin paino, ja saman painon sarjoissa toistojen summa. */
export function compareExercise(pairs: { cur: SetEntry; prev: SetEntry }[]): ExerciseCompare | null {
  if (pairs.length === 0) return null;
  const dw = Math.max(...pairs.map((p) => p.cur.weight)) - Math.max(...pairs.map((p) => p.prev.weight));
  if (Math.abs(dw) > 1e-9) return { dir: dw > 0 ? 'up' : 'down', text: `${fmtSigned(dw, 2)} kg` };
  const dr = pairs.reduce((a, p) => a + p.cur.reps - p.prev.reps, 0);
  if (dr === 0) return { dir: 'same', text: 'samat toistot' };
  return { dir: dr > 0 ? 'up' : 'down', text: `${fmtSigned(dr, 0)} ${Math.abs(dr) === 1 ? 'toisto' : 'toistoa'}` };
}

export interface WorkoutProgress {
  up: number;
  same: number;
  down: number;
  /** Liikkeet, joilla oli edellinen kerta verrattavaksi */
  compared: number;
  total: number;
}

export function countDirs(results: (ExerciseCompare | null)[]): WorkoutProgress {
  const done = results.filter((r): r is ExerciseCompare => r !== null);
  return {
    up: done.filter((r) => r.dir === 'up').length,
    same: done.filter((r) => r.dir === 'same').length,
    down: done.filter((r) => r.dir === 'down').length,
    compared: done.length,
    total: results.length,
  };
}

/** Tallennetun treenin liikkeet verrattuna kunkin liikkeen edelliseen kertaan. */
export function workoutProgress(data: AppData, w: Workout): WorkoutProgress {
  return countDirs(
    w.exercises.map((e) => {
      const name = data.exercises.find((x) => x.id === e.exerciseId)?.name ?? '';
      const prev = previousSession(data, name, w.date, w.id);
      if (!prev) return null;
      const pairs = e.sets.flatMap((cur, i) => (prev.sets[i] ? [{ cur, prev: prev.sets[i] }] : []));
      return compareExercise(pairs);
    }),
  );
}

export function progressText(p: WorkoutProgress): string {
  if (p.compared === 0) return '';
  const parts = [`${p.up}/${p.compared} liikettä paransi`];
  if (p.same) parts.push(`${p.same} samaa`);
  if (p.down) parts.push(`${p.down} heikompi`);
  return parts.join(', ');
}
