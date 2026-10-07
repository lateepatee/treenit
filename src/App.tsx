import { useEffect, useState } from 'react';
import { clearDraft, draftFromWorkout, loadDraft, type Draft } from './draft';
import { useStore } from './store';
import { DataView } from './views/DataView';
import { Home } from './views/Home';
import { ProgramEditor } from './views/ProgramEditor';
import { Progress } from './views/Progress';
import { Weight } from './views/Weight';
import { WorkoutEditor } from './views/WorkoutEditor';
import { Workouts } from './views/Workouts';

type Tab = 'home' | 'workouts' | 'progress' | 'weight' | 'data';

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'home', label: 'Koti', icon: '⌂' },
  { key: 'workouts', label: 'Treenit', icon: '✎' },
  { key: 'progress', label: 'Kehitys', icon: '↗' },
  { key: 'weight', label: 'Paino', icon: '⚖' },
  { key: 'data', label: 'Tiedot', icon: '⋯' },
];

interface EditorState {
  workoutId: string | null;
  /** Uuden treenin lähtötilanne (pohja tai vanha treeni) */
  start?: Draft;
  /** Pakottaa editorin alustumaan uudelleen */
  key: number;
}

export default function App() {
  const { data } = useStore();
  const [tab, setTab] = useState<Tab>('home');
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [programOpen, setProgramOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(t);
  }, [toast]);
  const [exerciseId, setExerciseId] = useState<string | null>(null);

  const go = (t: Tab) => {
    setTab(t);
    window.scrollTo(0, 0);
  };

  const openEditor = (workoutId: string | null, start?: Draft) => {
    const draft = loadDraft();
    const conflicting = draft && (start || draft.workoutId !== workoutId);
    if (conflicting) {
      if (!confirm('Sinulla on keskeneräinen treeni. Hylätäänkö se?')) return;
      clearDraft();
    }
    setProgramOpen(false);
    setEditor({ workoutId, start, key: Date.now() });
    go('workouts');
  };

  const closeEditor = (message?: string) => {
    setEditor(null);
    setToast(message ?? null);
    window.scrollTo(0, 0);
  };

  return (
    <div className="app">
      <nav className="nav" aria-label="Päävalikko">
        <span className="brand">Treenipäiväkirja</span>
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={tab === t.key ? 'nav-btn active' : 'nav-btn'}
            aria-current={tab === t.key ? 'page' : undefined}
            onClick={() => go(t.key)}
          >
            <span className="nav-icon" aria-hidden="true">
              {t.icon}
            </span>
            {t.label}
          </button>
        ))}
      </nav>

      <main className="main">
        {tab === 'home' && (
          <Home
            onNewWorkout={(start) => openEditor(null, start)}
            onOpenWorkout={(id) => openEditor(id)}
            onOpenExercise={(id) => {
              setExerciseId(id);
              go('progress');
            }}
            onGo={go}
          />
        )}
        {tab === 'workouts' &&
          (editor ? (
            <WorkoutEditor key={editor.key} workoutId={editor.workoutId} start={editor.start} onClose={closeEditor} />
          ) : programOpen ? (
            <ProgramEditor
              onClose={() => {
                setProgramOpen(false);
                window.scrollTo(0, 0);
              }}
            />
          ) : (
            <Workouts
              onOpen={(id) => openEditor(id)}
              onRepeat={(w) => openEditor(null, draftFromWorkout(w, data, true))}
              onOpenProgram={() => {
                setProgramOpen(true);
                window.scrollTo(0, 0);
              }}
            />
          ))}
        {tab === 'progress' && <Progress exerciseId={exerciseId} onSelectExercise={setExerciseId} />}
        {tab === 'weight' && <Weight />}
        {tab === 'data' && <DataView />}
      </main>

      {toast && (
        <div className="toast" role="status" onClick={() => setToast(null)}>
          {toast}
        </div>
      )}
    </div>
  );
}
