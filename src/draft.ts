import type { AppData, Workout } from './types';
import { numToInput, todayISO, uid } from './utils';

/** Muokattavan treenin tila. Kentät merkkijonoina, jotta "62," tms. keskeneräinen syöte säilyy. */
export interface DraftSet {
  id: string;
  weight: string;
  reps: string;
}

export interface DraftExercise {
  id: string;
  name: string;
  sets: DraftSet[];
}

export interface Draft {
  /** null = uusi treeni */
  workoutId: string | null;
  /** Pohja, josta treeni aloitettiin */
  templateId?: string;
  date: string;
  name: string;
  notes: string;
  exercises: DraftExercise[];
}

const DRAFT_KEY = 'jumppasovellus.draft.v1';

export const emptySet = (): DraftSet => ({ id: uid(), weight: '', reps: '' });

export const emptyExercise = (): DraftExercise => ({ id: uid(), name: '', sets: [emptySet()] });

export const emptyDraft = (): Draft => ({
  workoutId: null,
  date: todayISO(),
  name: '',
  notes: '',
  exercises: [emptyExercise()],
});

export function draftFromWorkout(w: Workout, data: AppData, asNew: boolean): Draft {
  const nameOf = (id: string) => data.exercises.find((e) => e.id === id)?.name ?? '';
  return {
    workoutId: asNew ? null : w.id,
    templateId: w.templateId,
    date: asNew ? todayISO() : w.date,
    name: w.name,
    notes: asNew ? '' : w.notes,
    exercises: w.exercises.map((e) => ({
      id: uid(),
      name: nameOf(e.exerciseId),
      sets: e.sets.map((s) => ({ id: uid(), weight: numToInput(s.weight), reps: String(s.reps) })),
    })),
  };
}

export function loadDraft(): Draft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
}

export function saveDraft(d: Draft): void {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
  } catch {
    // luonnoksen tallennus on vain varmistus
  }
}

export function clearDraft(): void {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // ei väliä
  }
}
