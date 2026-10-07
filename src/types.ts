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

export interface AppData {
  version: 1;
  exercises: Exercise[];
  workouts: Workout[];
  bodyWeights: BodyWeightEntry[];
}
