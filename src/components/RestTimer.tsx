import { useEffect, useRef, useState } from 'react';
import { addRest, beep, REST_SECONDS, stopRest, useRestEnd } from '../restTimer';

/** Ajastin piilotetaan, kun palautuksen päättymisestä on kulunut näin kauan. */
const HIDE_AFTER_MS = 60_000;

function fmt(ms: number): string {
  const s = Math.ceil(Math.abs(ms) / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function RestTimer() {
  const endAt = useRestEnd();
  const [now, setNow] = useState(Date.now);
  const beepedFor = useRef<number | null>(null);

  useEffect(() => {
    if (!endAt) return;
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [endAt]);

  const left = endAt ? endAt - now : 0;

  useEffect(() => {
    if (!endAt || left > 0) return;
    // Piippaus vain, jos palautus päättyi juuri nyt eikä esim. kun appi avataan myöhemmin.
    if (beepedFor.current !== endAt && left > -2000) beep();
    beepedFor.current = endAt;
    if (left < -HIDE_AFTER_MS) stopRest();
  }, [endAt, left]);

  if (!endAt) return null;
  const done = left <= 0;
  const progress = Math.min(1, Math.max(0, 1 - left / (REST_SECONDS * 1000)));

  return (
    <div className={done ? 'rest-timer done' : 'rest-timer'} role="timer" aria-live={done ? 'assertive' : 'off'}>
      <div className="rest-bar" style={{ transform: `scaleX(${done ? 1 : progress})` }} aria-hidden="true" />
      <div className="rest-text">
        {done ? (
          <>
            <strong>Palautus ohi</strong> <span className="rest-sub">seuraava sarja! (+{fmt(left)})</span>
          </>
        ) : (
          <>
            <span className="rest-sub">Palautus</span> <strong className="num">{fmt(left)}</strong>
          </>
        )}
      </div>
      {!done && (
        <button type="button" className="rest-btn" onClick={() => addRest(30)}>
          +30 s
        </button>
      )}
      <button type="button" className="rest-btn" aria-label="Sulje ajastin" onClick={stopRest}>
        ✕
      </button>
    </div>
  );
}
