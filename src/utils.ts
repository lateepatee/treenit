import type { SetEntry } from './types';

export const DAY = 86_400_000;

// crypto.randomUUID puuttuu ei-suojatuissa yhteyksissä (esim. http://192.168.x.x puhelimelta)
export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

export function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayISO(): string {
  return toISO(new Date());
}

export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return toISO(new Date(y, m - 1, d + days));
}

/** Viikon maanantai (viikko alkaa maanantaista). */
export function weekStart(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dow = (new Date(y, m - 1, d).getDay() + 6) % 7;
  return addDays(iso, -dow);
}

/** ISO-viikkonumero, kuten suomalaisessa kalenterissa. */
export function isoWeek(iso: string): number {
  const thursday = addDays(weekStart(iso), 3);
  const jan1 = `${thursday.slice(0, 4)}-01-01`;
  return Math.floor((dayNumber(thursday) - dayNumber(jan1)) / 7) + 1;
}

export function addMonths(iso: string, months: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return toISO(new Date(y, m - 1 + months, d));
}

/** Päivämäärä aikaleimaksi (UTC-keskiyö), jotta kesäaika ei sotke päivälaskuja. */
export function isoToTime(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

export function dayNumber(iso: string): number {
  return Math.round(isoToTime(iso) / DAY);
}

const WEEKDAYS = ['su', 'ma', 'ti', 'ke', 'to', 'pe', 'la'];

export function fmtDate(iso: string, opts: { year?: boolean; weekday?: boolean } = {}): string {
  const [y, m, d] = iso.split('-').map(Number);
  const base = opts.year === false ? `${d}.${m}.` : `${d}.${m}.${y}`;
  if (!opts.weekday) return base;
  return `${WEEKDAYS[new Date(y, m - 1, d).getDay()]} ${base}`;
}

export function fmtTick(t: number, spanDays: number): string {
  const d = new Date(t);
  if (spanDays > 200) return `${d.getUTCMonth() + 1}/${String(d.getUTCFullYear()).slice(2)}`;
  return `${d.getUTCDate()}.${d.getUTCMonth() + 1}.`;
}

export function fmtNum(n: number, decimals = 1): string {
  return n.toLocaleString('fi-FI', { maximumFractionDigits: decimals });
}

export function fmtSigned(n: number, decimals = 1): string {
  const rounded = Number(n.toFixed(decimals));
  if (rounded === 0) return '±0';
  return (rounded > 0 ? '+' : '−') + fmtNum(Math.abs(rounded), decimals);
}

/** Hyväksyy sekä pilkun että pisteen desimaalierottimena. */
export function parseNum(s: string): number | null {
  const v = parseFloat(s.replace(',', '.').trim());
  return Number.isFinite(v) ? v : null;
}

export function numToInput(n: number): string {
  return String(n).replace('.', ',');
}

/** Arvioitu yhden toiston maksimi (Epley). */
export function e1rm(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

/** Pienimmän neliösumman kulmakerroin (y-yksikköä per x-yksikkö). */
export function linearSlope(points: { x: number; y: number }[]): number | null {
  const n = points.length;
  if (n < 2) return null;
  const mx = points.reduce((a, p) => a + p.x, 0) / n;
  const my = points.reduce((a, p) => a + p.y, 0) / n;
  let num = 0;
  let den = 0;
  for (const p of points) {
    num += (p.x - mx) * (p.y - my);
    den += (p.x - mx) ** 2;
  }
  return den === 0 ? null : num / den;
}

/** Trendi viikkotasolla päivämäärä-arvopareista. */
export function weeklyTrend(points: { date: string; value: number }[]): number | null {
  const slope = linearSlope(points.map((p) => ({ x: dayNumber(p.date), y: p.value })));
  return slope === null ? null : slope * 7;
}

export function summarizeSets(sets: SetEntry[]): string {
  if (sets.length === 0) return '–';
  const weighted = sets.some((s) => s.weight > 0);
  const sameWeight = sets.every((s) => s.weight === sets[0].weight);
  const sameReps = sets.every((s) => s.reps === sets[0].reps);
  if (sameWeight && sameReps) {
    return `${sets.length}×${sets[0].reps}` + (weighted ? ` @ ${fmtNum(sets[0].weight, 2)} kg` : '');
  }
  if (sameWeight) {
    return (weighted ? `${fmtNum(sets[0].weight, 2)} kg: ` : 'toistot: ') + sets.map((s) => s.reps).join(', ');
  }
  return sets.map((s) => `${fmtNum(s.weight, 2)}×${s.reps}`).join(', ');
}

export type RangeKey = '1m' | '3m' | '6m' | '1y' | 'all';

export const RANGES: { key: RangeKey; label: string }[] = [
  { key: '1m', label: '1 kk' },
  { key: '3m', label: '3 kk' },
  { key: '6m', label: '6 kk' },
  { key: '1y', label: '1 v' },
  { key: 'all', label: 'Kaikki' },
];

export function rangeStart(key: RangeKey): string | null {
  const months = { '1m': 1, '3m': 3, '6m': 6, '1y': 12, all: 0 }[key];
  return months ? addMonths(todayISO(), -months) : null;
}
