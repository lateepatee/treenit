import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AppData, SetEntry, Workout } from './types';
import { uid } from './utils';

const KEY = 'jumppasovellus.data.v1';

export const emptyData = (): AppData => ({ version: 1, exercises: [], workouts: [], bodyWeights: [] });

export function isAppData(x: unknown): x is AppData {
  if (!x || typeof x !== 'object') return false;
  const d = x as Record<string, unknown>;
  return Array.isArray(d.exercises) && Array.isArray(d.workouts) && Array.isArray(d.bodyWeights);
}

function load(): AppData {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (isAppData(parsed)) return parsed;
    }
  } catch {
    // korruptoitunut tai estetty tallennus -> aloitetaan tyhjästä
  }
  return emptyData();
}

export interface WorkoutInput {
  id: string | null;
  date: string;
  name: string;
  notes: string;
  exercises: { name: string; sets: SetEntry[] }[];
}

interface Store {
  data: AppData;
  saveWorkout(input: WorkoutInput): void;
  deleteWorkout(id: string): void;
  setBodyWeight(date: string, weight: number): void;
  deleteBodyWeight(id: string): void;
  /** Nimeää liikkeen uudelleen; jos nimi on jo toisella liikkeellä, liikkeet yhdistetään. */
  renameExercise(id: string, name: string): void;
  replaceData(data: AppData): void;
}

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch {
      alert('Tietojen tallennus epäonnistui. Ota varmuuskopio Tiedot-välilehdeltä.');
    }
  }, [data]);

  const store = useMemo<Store>(
    () => ({
      data,
      saveWorkout(input) {
        setData((prev) => {
          const exercises = [...prev.exercises];
          const resolve = (name: string) => {
            const n = name.trim();
            const found = exercises.find((e) => e.name.toLowerCase() === n.toLowerCase());
            if (found) return found.id;
            const created = { id: uid(), name: n };
            exercises.push(created);
            return created.id;
          };
          const workout: Workout = {
            id: input.id ?? uid(),
            date: input.date,
            name: input.name.trim(),
            notes: input.notes.trim(),
            exercises: input.exercises.map((e) => ({ exerciseId: resolve(e.name), sets: e.sets })),
          };
          const workouts = input.id
            ? prev.workouts.map((w) => (w.id === input.id ? workout : w))
            : [...prev.workouts, workout];
          return { ...prev, exercises, workouts };
        });
      },
      deleteWorkout(id) {
        setData((prev) => ({ ...prev, workouts: prev.workouts.filter((w) => w.id !== id) }));
      },
      setBodyWeight(date, weight) {
        setData((prev) => {
          const existing = prev.bodyWeights.find((b) => b.date === date);
          const bodyWeights = existing
            ? prev.bodyWeights.map((b) => (b.date === date ? { ...b, weight } : b))
            : [...prev.bodyWeights, { id: uid(), date, weight }];
          return { ...prev, bodyWeights };
        });
      },
      deleteBodyWeight(id) {
        setData((prev) => ({ ...prev, bodyWeights: prev.bodyWeights.filter((b) => b.id !== id) }));
      },
      renameExercise(id, name) {
        setData((prev) => {
          const n = name.trim();
          const target = prev.exercises.find((e) => e.id !== id && e.name.toLowerCase() === n.toLowerCase());
          if (!target) {
            return { ...prev, exercises: prev.exercises.map((e) => (e.id === id ? { ...e, name: n } : e)) };
          }
          return {
            ...prev,
            exercises: prev.exercises.filter((e) => e.id !== id),
            workouts: prev.workouts.map((w) => ({
              ...w,
              exercises: w.exercises.map((e) => (e.exerciseId === id ? { ...e, exerciseId: target.id } : e)),
            })),
          };
        });
      },
      replaceData(next) {
        setData(next);
      },
    }),
    [data],
  );

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const s = useContext(StoreContext);
  if (!s) throw new Error('useStore StoreProviderin ulkopuolella');
  return s;
}
