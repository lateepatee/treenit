export interface SetEntry {
  /** kg, 0 = kehonpaino */
  weight: number;
  reps: number;
}

export interface WorkoutExercise {
  exerciseId: string;
  sets: SetEntry[];
}

export interface Workout {
  id: string;
  /** YYYY-MM-DD */
  date: string;
  name: string;
  notes: string;
  exercises: WorkoutExercise[];
  /** Pohja, josta treeni aloitettiin; vuorottelu päätellään tästä */
  templateId?: string;
}

export interface Exercise {
  id: string;
  name: string;
}

export interface BodyWeightEntry {
  id: string;
  /** YYYY-MM-DD */
  date: string;
  weight: number;
}

/** Treenipohja, esim. Yläpäivä. Pohjat tehdään vuorotellen listan järjestyksessä. */
export interface Template {
  id: string;
  name: string;
  exerciseIds: string[];
}

export interface AppData {
  version: 1;
  exercises: Exercise[];
  workouts: Workout[];
  bodyWeights: BodyWeightEntry[];
  templates: Template[];
}

/** Tallennettu muoto: vanhoista versioista ja varmuuskopioista puuttuu templates. */
export type StoredData = Omit<AppData, 'templates'> & { templates?: Template[] };
