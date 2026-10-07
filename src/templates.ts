import { emptySet, type Draft } from './draft';
import type { AppData, StoredData, Template } from './types';
import { todayISO, uid } from './utils';

/** Ylä/ala-jako, joka tehdään vuorotellen. Käytetään, kun tallennetuissa tiedoissa ei vielä ole pohjia. */
const DEFAULT_TEMPLATES: { name: string; legacyName: string; exercises: string[] }[] = [
  {
    name: 'Yläpäivä',
    legacyName: 'ylä',
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
    name: 'Alapäivä',
    legacyName: 'ala',
    exercises: ['Hack-kyykky', 'RDL', 'Reidenojennus', 'Reidenkoukistus', 'Vatsat', 'Pohkeet'],
  },
];

/** Jokaisessa liikkeessä kaksi työsarjaa. */
export const WORK_SETS = 2;

/** Treenejä viikossa (ylä, ala, ylä, ala). */
export const WEEKLY_TARGET = 4;

/**
 * Lisää oletuspohjat tietoihin, joista ne puuttuvat. Ennen pohjia tallennetut "Ylä"/"Ala"-treenit
 * liitetään pohjiin ja nimetään pohjan mukaan, jotta vuorottelu ja historia jatkuvat.
 */
export function migrate(d: StoredData): AppData {
  if (d.templates) return d as AppData;
  const exercises = [...d.exercises];
  const idFor = (name: string) => {
    const found = exercises.find((e) => e.name.toLowerCase() === name.toLowerCase());
    if (found) return found.id;
    const created = { id: uid(), name };
    exercises.push(created);
    return created.id;
  };
  const templates: Template[] = DEFAULT_TEMPLATES.map((t) => ({
    id: uid(),
    name: t.name,
    exerciseIds: t.exercises.map(idFor),
  }));
  const workouts = d.workouts.map((w) => {
    const i = DEFAULT_TEMPLATES.findIndex((t) => t.legacyName === w.name.trim().toLowerCase());
    return i >= 0 && !w.templateId ? { ...w, name: templates[i].name, templateId: templates[i].id } : w;
  });
  return { ...d, exercises, workouts, templates };
}

export function draftFromTemplate(t: Template, data: AppData): Draft {
  const nameOf = (id: string) => data.exercises.find((e) => e.id === id)?.name ?? '';
  return {
    workoutId: null,
    templateId: t.id,
    date: todayISO(),
    name: t.name,
    notes: '',
    exercises: t.exerciseIds.map((id) => ({
      id: uid(),
      name: nameOf(id),
      sets: Array.from({ length: WORK_SETS }, emptySet),
    })),
  };
}

/** Seuraavaksi vuorossa oleva pohja: viimeksi tehtyä pohjaa seuraava. */
export function nextTemplate(data: AppData): Template | null {
  const { templates } = data;
  if (templates.length === 0) return null;
  // Uusin ensin; saman päivän treeneistä myöhemmin tallennettu ensin.
  const latest = [...data.workouts]
    .reverse()
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((w) => templates.findIndex((t) => t.id === w.templateId))
    .find((i) => i >= 0);
  return latest === undefined ? templates[0] : templates[(latest + 1) % templates.length];
}
