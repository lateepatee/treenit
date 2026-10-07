import { useMemo } from 'react';
import { TimeChart } from '../components/TimeChart';
import { Delta, StatTile, WeekProgress } from '../components/ui';
import type { Draft } from '../draft';
import { recentPRs, weeklyAverages, weightRows } from '../stats';
import { useStore } from '../store';
import { draftFromTemplate, nextTemplate, TEMPLATES, WEEKLY_TARGET } from '../templates';
import { useChartColors } from '../theme';
import { addDays, fmtDate, fmtNum, isoWeek, summarizeSets, todayISO, weekStart } from '../utils';

interface Props {
  /** start puuttuu = tyhjä treeni */
  onNewWorkout: (start?: Draft) => void;
  onOpenWorkout: (id: string) => void;
  onOpenExercise: (id: string) => void;
  onGo: (tab: 'weight' | 'data') => void;
}

export function Home({ onNewWorkout, onOpenWorkout, onOpenExercise, onGo }: Props) {
  const { data } = useStore();
  const colors = useChartColors();
  const today = todayISO();

  const weights = useMemo(() => weightRows(data.bodyWeights), [data.bodyWeights]);
  const prs = useMemo(() => recentPRs(data, addDays(today, -30)), [data, today]);
  const next = nextTemplate(data);

  const startCard = (
    <section className="card next-card">
      <div>
        <div className="tile-label">Seuraavaksi vuorossa</div>
        <div className="next-name">{next.name}</div>
        <div className="muted">{next.exercises.join(' · ')}</div>
      </div>
      <div className="row-gap wrap">
        <button type="button" className="btn primary" onClick={() => onNewWorkout(draftFromTemplate(next))}>
          Aloita {next.name}
        </button>
        {TEMPLATES.filter((t) => t !== next).map((t) => (
          <button key={t.name} type="button" className="btn ghost" onClick={() => onNewWorkout(draftFromTemplate(t))}>
            {t.name} sittenkin
          </button>
        ))}
      </div>
    </section>
  );

  if (data.workouts.length === 0 && data.bodyWeights.length === 0) {
    return (
      <div>
        <div className="view-header">
          <h1>Treenipäiväkirja</h1>
        </div>
        {startCard}
        <div className="card welcome">
          <p>
            Kirjaa treenisi sarja kerrallaan ja seuraa, miten painot, toistot ja oma kehonpaino kehittyvät ajan
            myötä.
          </p>
          <div className="row-gap wrap">
            <button type="button" className="btn ghost" onClick={() => onNewWorkout()}>
              Tyhjä treeni
            </button>
            <button type="button" className="btn ghost" onClick={() => onGo('weight')}>
              Lisää punnitus
            </button>
          </div>
          <p className="hint">
            Siirrätkö tietoja toisesta selaimesta? Palauta varmuuskopio{' '}
            <button type="button" className="link-btn" onClick={() => onGo('data')}>
              Tiedot
            </button>
            -välilehdeltä.
          </p>
        </div>
      </div>
    );
  }

  const week = weeklyAverages(data.bodyWeights)[0];
  const monday = weekStart(today);
  const thisWeek = data.workouts.filter((w) => w.date >= monday && w.date <= addDays(monday, 6)).length;
  const thisMonth = data.workouts.filter((w) => w.date.slice(0, 7) === today.slice(0, 7)).length;
  const recentWorkouts = [...data.workouts].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);
  const weights90 = weights.filter((w) => w.date >= addDays(today, -90));
  const nameOf = (id: string) => data.exercises.find((e) => e.id === id)?.name ?? '?';

  return (
    <div>
      <div className="view-header">
        <h1>Treenipäiväkirja</h1>
        <button type="button" className="btn ghost" onClick={() => onNewWorkout()}>
          + Tyhjä treeni
        </button>
      </div>

      {startCard}

      <div className="tiles">
        <StatTile
          label={week ? `Paino, vko ${isoWeek(week.week)} ka` : 'Kehonpaino'}
          value={week ? fmtNum(week.avg, 1) : '–'}
          unit={week ? 'kg' : undefined}
          sub={
            !week ? (
              'Ei punnituksia'
            ) : week.change === null ? (
              `${week.count} punnitusta`
            ) : (
              <>
                <Delta value={week.change} unit="kg" /> ed. viikkoon
              </>
            )
          }
        />
        <StatTile
          label={`Treenit, vko ${isoWeek(today)}`}
          value={
            <>
              {thisWeek}
              <span className="tile-unit"> / {WEEKLY_TARGET}</span>
            </>
          }
          sub={
            <>
              <WeekProgress done={thisWeek} target={WEEKLY_TARGET} />
              {thisWeek >= WEEKLY_TARGET ? ' Tavoite täynnä' : ` ${WEEKLY_TARGET - thisWeek} jäljellä`}
            </>
          }
        />
        <StatTile label="Treenit tässä kuussa" value={String(thisMonth)} />
        <StatTile label="Ennätykset 30 pv" value={String(prs.length)} />
      </div>

      {weights90.length >= 2 && (
        <section className="card">
          <div className="section-head">
            <h2>Kehonpaino, 90 pv (kg)</h2>
            <button type="button" className="link-btn" onClick={() => onGo('weight')}>
              Kaikki →
            </button>
          </div>
          <TimeChart
            rows={weights90}
            height={180}
            ariaLabel="Kehonpaino viimeiset 90 päivää"
            series={[
              { key: 'weight', label: 'Punnitus', color: colors.muted, line: false, dots: true },
              { key: 'avg', label: '7 pv keskiarvo', color: colors.series1, line: true, dots: false },
            ]}
            renderTooltip={(r) => (
              <>
                <div className="tip-title">{fmtDate(r.date, { weekday: true })}</div>
                <div>
                  <strong>{fmtNum(r.weight)} kg</strong> <span className="muted">(ka {fmtNum(r.avg, 1)})</span>
                </div>
              </>
            )}
          />
        </section>
      )}

      {prs.length > 0 && (
        <section className="card">
          <h2>Tuoreet ennätykset</h2>
          <ul className="plain-list">
            {prs.slice(0, 6).map((p) => (
              <li key={p.exerciseId + p.session.date}>
                <button type="button" className="row-btn" onClick={() => onOpenExercise(p.exerciseId)}>
                  <span>
                    <span className="badge">PR</span> {p.exerciseName}
                  </span>
                  <span className="muted num">
                    {p.session.topSet.weight > 0
                      ? `${fmtNum(p.session.topSet.weight, 2)} kg × ${p.session.topSet.reps}`
                      : `${p.session.maxReps} toistoa`}{' '}
                    · {fmtDate(p.session.date, { year: false })}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {recentWorkouts.length > 0 && (
        <section className="card">
          <h2>Viimeisimmät treenit</h2>
          <ul className="plain-list">
            {recentWorkouts.map((w) => (
              <li key={w.id}>
                <button type="button" className="row-btn stacked" onClick={() => onOpenWorkout(w.id)}>
                  <strong>
                    {fmtDate(w.date, { weekday: true })}
                    {w.name && <span className="muted"> · {w.name}</span>}
                  </strong>
                  <span className="muted">
                    {w.exercises.map((e) => `${nameOf(e.exerciseId)} ${summarizeSets(e.sets)}`).join(' · ')}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
