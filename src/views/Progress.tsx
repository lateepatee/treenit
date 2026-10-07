import { useMemo, useState } from 'react';
import { TimeChart } from '../components/TimeChart';
import { Delta, Empty, RangePicker, Segmented, StatTile } from '../components/ui';
import { exerciseSessions, isBodyweightExercise, METRICS, usedExercises, type MetricKey } from '../stats';
import { useStore } from '../store';
import { useChartColors } from '../theme';
import { fmtDate, fmtNum, isoToTime, rangeStart, summarizeSets, weeklyTrend, type RangeKey } from '../utils';

interface Props {
  exerciseId: string | null;
  onSelectExercise: (id: string) => void;
}

const WEIGHTED_METRICS: MetricKey[] = ['e1rm', 'top', 'maxReps', 'totalReps', 'volume'];
const BODYWEIGHT_METRICS: MetricKey[] = ['maxReps', 'totalReps'];

export function Progress({ exerciseId, onSelectExercise }: Props) {
  const { data, renameExercise } = useStore();
  const colors = useChartColors();
  const exercises = useMemo(() => usedExercises(data), [data]);
  const selected = exercises.find((e) => e.id === exerciseId) ?? exercises[0];

  const [range, setRange] = useState<RangeKey>('6m');
  const [metricChoice, setMetricChoice] = useState<MetricKey>('e1rm');

  const sessions = useMemo(() => (selected ? exerciseSessions(data, selected.id) : []), [data, selected]);
  const bodyweight = isBodyweightExercise(sessions);
  const available = bodyweight ? BODYWEIGHT_METRICS : WEIGHTED_METRICS;
  const metricKey = available.includes(metricChoice) ? metricChoice : available[0];
  const metric = METRICS[metricKey];

  if (!selected) {
    return (
      <div>
        <div className="view-header">
          <h1>Kehitys</h1>
        </div>
        <Empty>Kirjaa ensin treenejä, niin näet täällä liikekohtaiset trendit.</Empty>
      </div>
    );
  }

  const start = rangeStart(range);
  const inRange = sessions.filter((s) => !start || s.date >= start);
  const rows = inRange.map((s) => ({ t: isoToTime(s.date), value: metric.get(s), session: s }));
  const values = rows.map((r) => r.value);

  const allTimeBest = sessions.reduce<(typeof sessions)[number] | null>(
    (best, s) => (!best || metric.get(s) > metric.get(best) ? s : best),
    null,
  );
  const change = values.length >= 2 ? values[values.length - 1] - values[0] : null;
  const trend = weeklyTrend(rows.map((r) => ({ date: r.session.date, value: r.value })));

  const handleRename = () => {
    const name = prompt('Liikkeen uusi nimi:', selected.name)?.trim();
    if (!name || name === selected.name) return;
    const other = data.exercises.find((e) => e.id !== selected.id && e.name.toLowerCase() === name.toLowerCase());
    if (other && !confirm(`Liike “${other.name}” on jo olemassa. Yhdistetäänkö “${selected.name}” siihen?`)) return;
    renameExercise(selected.id, name);
    if (other) onSelectExercise(other.id);
  };

  return (
    <div>
      <div className="view-header">
        <h1>Kehitys</h1>
      </div>

      <div className="card controls">
        <div className="row-gap">
          <label className="field grow">
            <span>Liike</span>
            <select value={selected.id} onChange={(e) => onSelectExercise(e.target.value)}>
              {exercises.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} ({e.sessions})
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="btn ghost small align-end" onClick={handleRename}>
            Nimeä uudelleen
          </button>
        </div>
        <Segmented
          label="Mittari"
          options={available.map((k) => ({ key: k, label: METRICS[k].label }))}
          value={metricKey}
          onChange={setMetricChoice}
        />
        <RangePicker value={range} onChange={setRange} />
      </div>

      <div className="tiles">
        <StatTile
          label="Ennätys"
          value={allTimeBest ? fmtNum(metric.get(allTimeBest), metric.decimals) : '–'}
          unit={metric.unit}
          sub={allTimeBest && fmtDate(allTimeBest.date)}
        />
        <StatTile
          label="Muutos jaksolla"
          value={change === null ? '–' : <Delta value={change} unit={metric.unit} decimals={metric.decimals || 1} upIsGood />}
          sub={change === null ? 'Tarvitaan 2 kertaa' : 'ensimmäisestä viimeisimpään'}
        />
        <StatTile
          label="Trendi"
          value={trend === null ? '–' : <Delta value={trend} unit={`${metric.unit}/vko`} decimals={1} upIsGood />}
          sub={trend === null ? 'Tarvitaan 2 kertaa' : 'sovitettu suora, per viikko'}
        />
      </div>

      <section className="card">
        <h2>
          {selected.name}: {metric.label.toLowerCase()} ({metric.unit})
        </h2>
        <p className="hint">{metric.hint} Isommat pisteet ovat ennätyksiä.</p>
        {rows.length === 0 ? (
          <Empty>Ei treenikertoja valitulla aikavälillä.</Empty>
        ) : (
          <TimeChart
            rows={rows}
            ariaLabel={`${selected.name}, ${metric.label} ajan funktiona`}
            series={[{ key: 'value', label: metric.label, color: colors.series1, line: true, dots: true }]}
            highlight={(r) => r.session.isPR}
            renderTooltip={(r) => (
              <>
                <div className="tip-title">
                  {fmtDate(r.session.date, { weekday: true })}
                  {r.session.isPR && <span className="badge">Ennätys</span>}
                </div>
                <div>
                  {metric.label}: <strong>{fmtNum(r.value, metric.decimals)} {metric.unit}</strong>
                </div>
                <div className="muted">{summarizeSets(r.session.sets)}</div>
              </>
            )}
          />
        )}
      </section>

      {inRange.length > 0 && (
        <section className="card">
          <h2>Treenikerrat</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Päivä</th>
                  <th>Sarjat</th>
                  {!bodyweight && <th className="num">1RM</th>}
                  {!bodyweight && <th className="num">Volyymi</th>}
                  <th className="num">Toistot</th>
                </tr>
              </thead>
              <tbody>
                {[...inRange].reverse().map((s) => (
                  <tr key={s.workoutId}>
                    <td className="nowrap">
                      {fmtDate(s.date)}
                      {s.isPR && <span className="badge">PR</span>}
                    </td>
                    <td>{summarizeSets(s.sets)}</td>
                    {!bodyweight && <td className="num">{fmtNum(s.e1rm, 1)}</td>}
                    {!bodyweight && <td className="num">{fmtNum(s.volume, 0)}</td>}
                    <td className="num">{s.totalReps}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
