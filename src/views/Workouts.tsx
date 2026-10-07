import { Fragment } from 'react';
import { loadDraft } from '../draft';
import { useStore } from '../store';
import type { Workout } from '../types';
import { addDays, fmtDate, isoWeek, summarizeSets, weekStart } from '../utils';
import { Empty, WeekProgress } from '../components/ui';
import { WEEKLY_TARGET } from '../templates';

interface Props {
  onOpen: (workoutId: string | null) => void;
  onRepeat: (w: Workout) => void;
  onOpenProgram: () => void;
}

export function Workouts({ onOpen, onRepeat, onOpenProgram }: Props) {
  const { data } = useStore();
  const draft = loadDraft();
  const workouts = [...data.workouts].sort((a, b) => b.date.localeCompare(a.date));
  const nameOf = (id: string) => data.exercises.find((e) => e.id === id)?.name ?? '?';
  const perWeek = new Map<string, number>();
  for (const w of workouts) perWeek.set(weekStart(w.date), (perWeek.get(weekStart(w.date)) ?? 0) + 1);

  return (
    <div>
      <div className="view-header">
        <h1>Treenit</h1>
        <button type="button" className="btn primary" onClick={() => onOpen(null)}>
          + Uusi treeni
        </button>
      </div>

      <section className="card program-card">
        <div>
          <h2>Treeniohjelma</h2>
          <p className="muted">
            {data.templates.map((t) => `${t.name} (${t.exerciseIds.length} liikettä)`).join(' → ')}
          </p>
        </div>
        <button type="button" className="btn ghost small" onClick={onOpenProgram}>
          Muokkaa
        </button>
      </section>

      {draft && (
        <div className="card banner">
          <span>
            Sinulla on keskeneräinen {draft.workoutId ? 'muokkaus' : 'treeni'} ({fmtDate(draft.date, { weekday: true })}).
          </span>
          <button type="button" className="btn primary small" onClick={() => onOpen(draft.workoutId)}>
            Jatka
          </button>
        </div>
      )}

      {workouts.length === 0 ? (
        <Empty>Ei vielä treenejä. Aloita painamalla “Uusi treeni”.</Empty>
      ) : (
        <ul className="list">
          {workouts.map((w, idx) => {
            const week = weekStart(w.date);
            const newWeek = idx === 0 || weekStart(workouts[idx - 1].date) !== week;
            const count = perWeek.get(week)!;
            return (
              <Fragment key={w.id}>
                {newWeek && (
                  <li className="week-head">
                    <span>
                      <strong>Vko {isoWeek(week)}</strong>{' '}
                      <span className="muted">
                        {fmtDate(week, { year: false })}–{fmtDate(addDays(week, 6), { year: false })}
                      </span>
                    </span>
                    <span className="muted num">
                      <WeekProgress done={count} target={WEEKLY_TARGET} /> {count}/{WEEKLY_TARGET}
                    </span>
                  </li>
                )}
                <li className="card workout-item">
                  <button type="button" className="workout-main" onClick={() => onOpen(w.id)}>
                    <div className="workout-title">
                      <strong>{fmtDate(w.date, { weekday: true })}</strong>
                      {w.name && <span className="muted"> · {w.name}</span>}
                    </div>
                    <ul className="workout-exercises">
                      {w.exercises.map((e, i) => (
                        <li key={i}>
                          <span>{nameOf(e.exerciseId)}</span>
                          <span className="muted num">{summarizeSets(e.sets)}</span>
                        </li>
                      ))}
                    </ul>
                    {w.notes && <p className="workout-notes">{w.notes}</p>}
                  </button>
                  <button type="button" className="btn subtle small" onClick={() => onRepeat(w)}>
                    Toista tämä treeni
                  </button>
                </li>
              </Fragment>
            );
          })}
        </ul>
      )}
    </div>
  );
}
