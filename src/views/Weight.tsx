import { useMemo, useState, type FormEvent } from 'react';
import { TimeChart } from '../components/TimeChart';
import { Delta, Empty, RangePicker, StatTile } from '../components/ui';
import { weeklyAverages, weightRows } from '../stats';
import { useStore } from '../store';
import { useChartColors } from '../theme';
import { addDays, fmtDate, fmtNum, isoWeek, parseNum, rangeStart, todayISO, weeklyTrend, type RangeKey } from '../utils';

export function Weight() {
  const { data, setBodyWeight, deleteBodyWeight } = useStore();
  const colors = useChartColors();
  const [date, setDate] = useState(todayISO);
  const [input, setInput] = useState('');
  const [range, setRange] = useState<RangeKey>('3m');
  const [showAll, setShowAll] = useState(false);

  const allRows = useMemo(() => weightRows(data.bodyWeights), [data.bodyWeights]);
  const weeks = useMemo(() => weeklyAverages(data.bodyWeights), [data.bodyWeights]);
  const [showAllWeeks, setShowAllWeeks] = useState(false);
  const thisWeek = weeks[0];
  const visibleWeeks = showAllWeeks ? weeks : weeks.slice(0, 8);
  const start = rangeStart(range);
  const rows = allRows.filter((r) => !start || r.date >= start);
  const latest = allRows[allRows.length - 1];

  // Muutos lasketaan liukuvista keskiarvoista, jotta yksittäinen nesteheilahdus ei vääristä sitä.
  const change = rows.length >= 2 ? rows[rows.length - 1].avg - rows[0].avg : null;
  const trend = weeklyTrend(rows.map((r) => ({ date: r.date, value: r.weight })));

  const existingForDate = data.bodyWeights.find((b) => b.date === date);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const w = parseNum(input);
    if (w === null || w <= 20 || w > 400) {
      alert('Anna paino kilogrammoina, esim. 78,4');
      return;
    }
    setBodyWeight(date, Math.round(w * 10) / 10);
    setInput('');
  };

  const list = [...allRows].reverse();
  const visible = showAll ? list : list.slice(0, 14);

  return (
    <div>
      <div className="view-header">
        <h1>Kehonpaino</h1>
      </div>

      <form className="card weight-form" onSubmit={handleSubmit}>
        <label className="field">
          <span>Päivä</span>
          <input type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className="field">
          <span>Paino (kg)</span>
          <input
            type="text"
            inputMode="decimal"
            placeholder={existingForDate ? fmtNum(existingForDate.weight) : latest ? fmtNum(latest.weight) : 'esim. 78,4'}
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
        </label>
        <button type="submit" className="btn primary align-end">
          {existingForDate ? 'Päivitä' : 'Tallenna'}
        </button>
      </form>

      {allRows.length === 0 ? (
        <Empty>Kirjaa ensimmäinen punnitus yllä. Trendi näkyy, kun punnituksia on vähintään kaksi.</Empty>
      ) : (
        <>
          <div className="tiles">
            <StatTile
              label={`Vko ${isoWeek(thisWeek.week)} keskiarvo`}
              value={fmtNum(thisWeek.avg, 1)}
              unit="kg"
              sub={
                thisWeek.change === null ? (
                  `${thisWeek.count} punnitusta, ei vertailuviikkoa`
                ) : (
                  <>
                    <Delta value={thisWeek.change} unit="kg" /> edelliseen viikkoon
                  </>
                )
              }
            />
            <StatTile label="Viimeisin" value={fmtNum(latest.weight)} unit="kg" sub={fmtDate(latest.date)} />
            <StatTile
              label="Muutos jaksolla"
              value={change === null ? '–' : <Delta value={change} unit="kg" />}
              sub={change === null ? 'Tarvitaan 2 punnitusta' : '7 pv keskiarvoista'}
            />
            <StatTile
              label="Trendi"
              value={trend === null ? '–' : <Delta value={trend} unit="kg/vko" decimals={2} />}
              sub={trend === null ? 'Tarvitaan 2 punnitusta' : 'sovitettu suora, per viikko'}
            />
          </div>

          <section className="card">
            <div className="section-head">
              <h2>Painon kehitys (kg)</h2>
              <RangePicker value={range} onChange={setRange} />
            </div>
            {rows.length === 0 ? (
              <Empty>Ei punnituksia valitulla aikavälillä.</Empty>
            ) : (
              <TimeChart
                rows={rows}
                ariaLabel="Kehonpaino ja 7 päivän liukuva keskiarvo"
                series={[
                  { key: 'weight', label: 'Punnitus', color: colors.muted, line: false, dots: true },
                  { key: 'avg', label: '7 pv keskiarvo', color: colors.series1, line: true, dots: false },
                ]}
                renderTooltip={(r) => (
                  <>
                    <div className="tip-title">{fmtDate(r.date, { weekday: true })}</div>
                    <div>
                      Punnitus: <strong>{fmtNum(r.weight)} kg</strong>
                    </div>
                    <div className="muted">7 pv keskiarvo: {fmtNum(r.avg, 2)} kg</div>
                  </>
                )}
              />
            )}
          </section>

          <section className="card">
            <h2>Viikkokeskiarvot</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Viikko</th>
                    <th className="num">Keskiarvo</th>
                    <th className="num">Muutos</th>
                    <th className="num">Punn.</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleWeeks.map((w) => (
                    <tr key={w.week}>
                      <td>
                        vko {isoWeek(w.week)}{' '}
                        <span className="muted">
                          {fmtDate(w.week, { year: false })}–{fmtDate(addDays(w.week, 6), { year: false })}
                        </span>
                      </td>
                      <td className="num">{fmtNum(w.avg, 1)} kg</td>
                      <td className="num">{w.change === null ? '–' : <Delta value={w.change} unit="kg" />}</td>
                      <td className="num muted">{w.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {weeks.length > visibleWeeks.length && (
              <button type="button" className="btn subtle small" onClick={() => setShowAllWeeks(true)}>
                Näytä kaikki ({weeks.length})
              </button>
            )}
          </section>

          <section className="card">
            <h2>Punnitukset</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Päivä</th>
                    <th className="num">Paino</th>
                    <th className="num">7 pv ka</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {visible.map((r) => {
                    const entry = data.bodyWeights.find((b) => b.date === r.date)!;
                    return (
                      <tr key={entry.id}>
                        <td>{fmtDate(r.date, { weekday: true })}</td>
                        <td className="num">{fmtNum(r.weight)} kg</td>
                        <td className="num muted">{fmtNum(r.avg, 1)}</td>
                        <td className="num">
                          <button
                            type="button"
                            className="icon-btn"
                            aria-label={`Poista punnitus ${fmtDate(r.date)}`}
                            onClick={() => confirm(`Poistetaanko punnitus ${fmtDate(r.date)}?`) && deleteBodyWeight(entry.id)}
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {list.length > visible.length && (
              <button type="button" className="btn subtle small" onClick={() => setShowAll(true)}>
                Näytä kaikki ({list.length})
              </button>
            )}
          </section>
        </>
      )}
    </div>
  );
}
