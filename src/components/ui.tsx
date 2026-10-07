import type { ReactNode } from 'react';
import { fmtSigned, RANGES, type RangeKey } from '../utils';

export function StatTile({ label, value, unit, sub }: { label: string; value: ReactNode; unit?: string; sub?: ReactNode }) {
  return (
    <div className="tile">
      <div className="tile-label">{label}</div>
      <div className="tile-value">
        {value}
        {unit && <span className="tile-unit"> {unit}</span>}
      </div>
      {sub && <div className="tile-sub">{sub}</div>}
    </div>
  );
}

/**
 * Muutoksen näyttö. upIsGood=null -> neutraali (esim. kehonpaino, jonka suunta riippuu tavoitteesta).
 */
export function Delta({
  value,
  unit,
  decimals = 1,
  upIsGood = null,
}: {
  value: number;
  unit: string;
  decimals?: number;
  upIsGood?: boolean | null;
}) {
  const rounded = Number(value.toFixed(decimals));
  const arrow = rounded > 0 ? '▲' : rounded < 0 ? '▼' : '';
  const good = upIsGood !== null && rounded !== 0 && rounded > 0 === upIsGood;
  return (
    <span className={good ? 'delta delta-good' : 'delta'}>
      <span className="nowrap">
        {arrow && <span aria-hidden="true">{arrow} </span>}
        {fmtSigned(value, decimals)}
      </span>{' '}
      <span className="delta-unit">{unit}</span>
    </span>
  );
}

export function Segmented<K extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { key: K; label: string }[];
  value: K;
  onChange: (k: K) => void;
  label: string;
}) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          role="radio"
          aria-checked={o.key === value}
          className={o.key === value ? 'seg active' : 'seg'}
          onClick={() => onChange(o.key)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function RangePicker({ value, onChange }: { value: RangeKey; onChange: (k: RangeKey) => void }) {
  return <Segmented options={RANGES} value={value} onChange={onChange} label="Aikaväli" />;
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}

/** Viikon treenit tavoitetta vasten, yksi lohko per treeni. */
export function WeekProgress({ done, target }: { done: number; target: number }) {
  const slots = Math.max(done, target);
  return (
    <span className="week-progress" role="img" aria-label={`${done} / ${target} treeniä`}>
      {Array.from({ length: slots }, (_, i) => (
        <span key={i} className={i < done ? 'week-slot done' : 'week-slot'} />
      ))}
    </span>
  );
}
