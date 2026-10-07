import type { ReactNode } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useChartColors } from '../theme';
import { DAY, fmtNum, fmtTick } from '../utils';

export interface ChartSeries<T> {
  key: keyof T & string;
  label: string;
  color: string;
  /** false = pelkät pisteet ilman viivaa */
  line: boolean;
  dots: boolean;
}

interface Props<T extends { t: number }> {
  rows: T[];
  series: ChartSeries<T>[];
  renderTooltip: (row: T) => ReactNode;
  ariaLabel: string;
  height?: number;
  /** Korostettavat pisteet (esim. ennätykset) piirretään isompina. */
  highlight?: (row: T) => boolean;
}

function niceStep(raw: number): number {
  const pow = 10 ** Math.floor(Math.log10(raw));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * pow >= raw) return m * pow;
  return 10 * pow;
}

function yScale(values: number[]): { domain: [number, number]; ticks: number[] } {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;
  const pad = span > 0 ? span * 0.12 : Math.max(Math.abs(max) * 0.05, 1);
  const lo = min >= 0 ? Math.max(0, min - pad) : min - pad;
  const hi = max + pad;
  const step = niceStep((hi - lo) / 4);
  const start = Math.floor(lo / step) * step;
  const end = Math.ceil(hi / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= end + step / 2; v += step) ticks.push(Number(v.toFixed(6)));
  return { domain: [start, end], ticks };
}

function xScale(times: number[]): { domain: [number, number]; ticks: number[]; spanDays: number } {
  let lo = Math.min(...times);
  let hi = Math.max(...times);
  if (lo === hi) {
    lo -= 3 * DAY;
    hi += 3 * DAY;
  }
  const spanDays = (hi - lo) / DAY;
  const count = Math.min(5, Math.max(2, Math.floor(spanDays) + 1));
  const ticks = Array.from({ length: count }, (_, i) => Math.round((lo + ((hi - lo) * i) / (count - 1)) / DAY) * DAY);
  return { domain: [lo, hi], ticks: [...new Set(ticks)], spanDays };
}

export function TimeChart<T extends { t: number }>({ rows, series, renderTooltip, ariaLabel, height = 260, highlight }: Props<T>) {
  const c = useChartColors();
  if (rows.length === 0) return null;

  const values = rows
    .flatMap((r) => series.map((s): unknown => r[s.key]))
    .filter((v): v is number => typeof v === 'number');
  const y = yScale(values);
  const x = xScale(rows.map((r) => r.t));
  const dense = rows.length > 60;
  const axisTick = { fill: c.muted, fontSize: 12 };

  return (
    <div className="chart">
      {series.length > 1 && (
        <div className="legend">
          {series.map((s) => (
            <span key={s.key} className="legend-item">
              {s.line ? (
                <span className="legend-line" style={{ background: s.color }} />
              ) : (
                <span className="legend-dot" style={{ background: s.color }} />
              )}
              {s.label}
            </span>
          ))}
        </div>
      )}
      <div role="img" aria-label={ariaLabel}>
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke={c.grid} />
            <XAxis
              dataKey="t"
              type="number"
              domain={x.domain}
              ticks={x.ticks}
              tickFormatter={(t: number) => fmtTick(t, x.spanDays)}
              tick={axisTick}
              tickLine={false}
              axisLine={{ stroke: c.axis }}
              tickMargin={8}
            />
            <YAxis
              domain={y.domain}
              ticks={y.ticks}
              tickFormatter={(v: number) => fmtNum(v, 1)}
              tick={axisTick}
              tickLine={false}
              axisLine={false}
              width={48}
            />
            <Tooltip
              isAnimationActive={false}
              cursor={{ stroke: c.axis, strokeWidth: 1 }}
              content={({ active, payload }) =>
                active && payload && payload.length > 0 ? (
                  <div className="chart-tip">{renderTooltip(payload[0].payload as T)}</div>
                ) : null
              }
            />
            {series.map((s) => (
              <Line
                key={s.key}
                dataKey={s.key}
                name={s.label}
                type="linear"
                stroke={s.line ? s.color : 'none'}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                dot={
                  !s.dots
                    ? false
                    : (p: { cx?: number; cy?: number; index?: number; payload?: T }) => {
                        const big = !!(highlight && p.payload && highlight(p.payload));
                        if (p.cx == null || p.cy == null) return <g key={p.index} />;
                        return (
                          <circle
                            key={p.index}
                            cx={p.cx}
                            cy={p.cy}
                            r={big ? 6 : dense ? 3 : 4}
                            fill={s.color}
                            stroke={c.surface}
                            strokeWidth={dense && !big ? 1 : 2}
                          />
                        );
                      }
                }
                activeDot={{ r: 6, fill: s.color, stroke: c.surface, strokeWidth: 2 }}
                isAnimationActive={false}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
