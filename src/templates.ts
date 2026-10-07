import { emptySet, type Draft } from './draft';
import type { AppData } from './types';
import { todayISO, uid } from './utils';

export interface Template {
  /** Treenin nimi tallennettaessa; vuorottelu tunnistaa pohjan tästä */
  name: string;
  /** Napin teksti */
  label: string;
  exercises: string[];
}

/** Ylä/ala-jako, joka tehdään vuorotellen. Jokaisessa liikkeessä kaksi työsarjaa. */
export const TEMPLATES: Template[] = [
  {
    name: 'Ylä',
    label: 'Yläpäivä',
    exercises: [
      'Vinopenkki smithissä',
      'Selkäliike laitteessa',
      'Pec deck',
      'Takaolkapäät pec deckissä',
      'Pystypunnerrus käsipainoilla',
      'Ylätalja',
      'Hauis taljassa',
      'Ojentaja taljassa',
    ],
  },
  {
    name: 'Ala',
    label: 'Alapäivä',
    exercises: ['Hack-kyykky', 'RDL', 'Reidenojennus', 'Reidenkoukistus', 'Vatsat', 'Pohkeet'],
  },
];

export const WORK_SETS = 2;

/** Treenejä viikossa (ylä, ala, ylä, ala). */
export const WEEKLY_TARGET = 4;

export function draftFromTemplate(t: Template): Draft {
  return {
    workoutId: null,
    date: todayISO(),
    name: t.name,
    notes: '',
    exercises: t.exercises.map((name) => ({
      id: uid(),
      name,
      sets: Array.from({ length: WORK_SETS }, emptySet),
    })),
  };
}

/** Seuraavaksi vuorossa oleva pohja: se, jota ei tehty viimeksi. */
export function nextTemplate(data: AppData): Template {
  const byName = (name: string) => TEMPLATES.find((t) => t.name.toLowerCase() === name.trim().toLowerCase());
  const last = [...data.workouts]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((w) => byName(w.name))
    .find((t) => t !== undefined);
  if (!last) return TEMPLATES[0];
  return TEMPLATES[(TEMPLATES.indexOf(last) + 1) % TEMPLATES.length];
}
