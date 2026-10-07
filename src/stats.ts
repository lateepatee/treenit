import type { AppData, BodyWeightEntry, SetEntry } from './types';
import { addDays, dayNumber, e1rm, isoToTime, weekStart } from './utils';

export interface SessionStat {
  workoutId: string;
  date: string;
  sets: SetEntry[];
  /** Raskain sarja (painon mukaan, tasatilanteessa enemmän toistoja) */
  topSet: SetEntry;
  e1rm: number;
  volume: number;
  maxReps: number;
  totalReps: number;
  isPR: boolean;
}

/** Liikkeen kaikki treenikerrat aikajärjestyksessä, ennätykset merkittyinä. */
export function exerciseSessions(data: AppData, exerciseId: string): SessionStat[] {
  const sessions: SessionStat[] = [];
  for (const w of data.workouts) {
    const sets = w.exercises
      .filter((e) => e.exerciseId === exerciseId)
      .flatMap((e) => e.sets)
      .filter((s) => s.reps > 0);
    if (sets.length === 0) continue;
    const topSet = sets.reduce((best, s) =>
      s.weight > best.weight || (s.weight === best.weight && s.reps > best.reps) ? s : best,
    );
    sessions.push({
      workoutId: w.id,
      date: w.date,
      sets,
      topSet,
      e1rm: Math.max(...sets.map((s) => e1rm(s.weight, s.reps))),
      volume: sets.reduce((a, s) => a + s.weight * s.reps, 0),
      maxReps: Math.max(...sets.map((s) => s.reps)),
      totalReps: sets.reduce((a, s) => a + s.reps, 0),
      isPR: false,
    });
  }
  sessions.sort((a, b) => a.date.localeCompare(b.date));

  let bestWeight = -Infinity;
  let bestE1rm = -Infinity;
  let bestReps = -Infinity;
  sessions.forEach((s, i) => {
    const weighted = s.topSet.weight > 0;
    if (i > 0) {
      s.isPR = weighted
        ? s.topSet.weight > bestWeight || s.e1rm > bestE1rm + 1e-9
        : s.maxReps > bestReps;
    }
    bestWeight = Math.max(bestWeight, s.topSet.weight);
    bestE1rm = Math.max(bestE1rm, s.e1rm);
    bestReps = Math.max(bestReps, s.maxReps);
  });
  return sessions;
}

export function isBodyweightExercise(sessions: SessionStat[]): boolean {
  return sessions.length > 0 && sessions.every((s) => s.topSet.weight === 0);
}

export type MetricKey = 'e1rm' | 'top' | 'maxReps' | 'totalReps' | 'volume';

export const METRICS: Record<
  MetricKey,
  { label: string; unit: string; decimals: number; get: (s: SessionStat) => number; hint: string }
> = {
  e1rm: {
    label: 'Arvioitu 1RM',
    unit: 'kg',
    decimals: 1,
    get: (s) => s.e1rm,
    hint: 'Paras sarja muunnettuna yhden toiston maksimiksi (Epley).',
  },
  top: {
    label: 'Raskain sarja',
    unit: 'kg',
    decimals: 2,
    get: (s) => s.topSet.weight,
    hint: 'Kerran raskain käytetty paino.',
  },
  maxReps: {
    label: 'Max toistot',
    unit: 'toistoa',
    decimals: 0,
    get: (s) => s.maxReps,
    hint: 'Eniten toistoja yhdessä sarjassa.',
  },
  totalReps: {
    label: 'Toistot yhteensä',
    unit: 'toistoa',
    decimals: 0,
    get: (s) => s.totalReps,
    hint: 'Kaikkien sarjojen toistot yhteensä.',
  },
  volume: {
    label: 'Volyymi',
    unit: 'kg',
    decimals: 0,
    get: (s) => s.volume,
    hint: 'Paino × toistot laskettuna yhteen kaikista sarjoista.',
  },
};

export interface ExerciseUsage {
  id: string;
  name: string;
  sessions: number;
  lastDate: string;
}

/** Käytetyt liikkeet viimeksi tehty ensin. */
export function usedExercises(data: AppData): ExerciseUsage[] {
  const usage = new Map<string, { sessions: number; lastDate: string }>();
  for (const w of data.workouts) {
    for (const id of new Set(w.exercises.filter((e) => e.sets.length > 0).map((e) => e.exerciseId))) {
      const u = usage.get(id) ?? { sessions: 0, lastDate: '' };
      u.sessions += 1;
      if (w.date > u.lastDate) u.lastDate = w.date;
      usage.set(id, u);
    }
  }
  return data.exercises
    .filter((e) => usage.has(e.id))
    .map((e) => ({ id: e.id, name: e.name, ...usage.get(e.id)! }))
    .sort((a, b) => b.lastDate.localeCompare(a.lastDate) || a.name.localeCompare(b.name, 'fi'));
}

export interface RecentPR {
  exerciseId: string;
  exerciseName: string;
  session: SessionStat;
}

export function recentPRs(data: AppData, sinceISO: string): RecentPR[] {
  const result: RecentPR[] = [];
  for (const ex of data.exercises) {
    for (const s of exerciseSessions(data, ex.id)) {
      if (s.isPR && s.date >= sinceISO) result.push({ exerciseId: ex.id, exerciseName: ex.name, session: s });
    }
  }
  return result.sort((a, b) => b.session.date.localeCompare(a.session.date));
}

export interface WeightRow {
  t: number;
  date: string;
  weight: number;
  avg: number;
}

/** Punnitukset ja 7 päivän liukuva keskiarvo (kunkin päivän ja sitä edeltävien 6 päivän punnitukset). */
export function weightRows(entries: BodyWeightEntry[]): WeightRow[] {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const rows: WeightRow[] = [];
  let start = 0;
  let sum = 0;
  sorted.forEach((e, i) => {
    sum += e.weight;
    const day = dayNumber(e.date);
    while (dayNumber(sorted[start].date) <= day - 7) {
      sum -= sorted[start].weight;
      start++;
    }
    rows.push({ t: isoToTime(e.date), date: e.date, weight: e.weight, avg: sum / (i - start + 1) });
  });
  return rows;
}

export interface WeekAvg {
  /** Viikon maanantai */
  week: string;
  avg: number;
  count: number;
  /** Muutos edelliseen viikkoon; null jos edellisellä viikolla ei punnituksia */
  change: number | null;
}

/** Punnitusten keskiarvo kalenteriviikoittain (ma–su), uusin viikko ensin. */
export function weeklyAverages(entries: BodyWeightEntry[]): WeekAvg[] {
  const byWeek = new Map<string, { sum: number; count: number }>();
  for (const e of entries) {
    const w = weekStart(e.date);
    const acc = byWeek.get(w) ?? { sum: 0, count: 0 };
    acc.sum += e.weight;
    acc.count += 1;
    byWeek.set(w, acc);
  }
  const weeks = [...byWeek.entries()]
    .map(([week, { sum, count }]) => ({ week, avg: sum / count, count }))
    .sort((a, b) => b.week.localeCompare(a.week));
  return weeks.map((w) => {
    const prev = byWeek.get(addDays(w.week, -7));
    return { ...w, change: prev ? w.avg - prev.sum / prev.count : null };
  });
}
