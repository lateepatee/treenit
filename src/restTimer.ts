import { useSyncExternalStore } from 'react';

/** Palautus sarjojen välissä. */
export const REST_SECONDS = 120;

const KEY = 'jumppasovellus.rest';

// Aika lasketaan loppuhetken aikaleimasta, joten se pysyy oikeana, vaikka puhelin lukittaisiin
// tai appi suljettaisiin välillä.
let endAt: number | null = read();
const listeners = new Set<() => void>();

function read(): number | null {
  try {
    const v = Number(localStorage.getItem(KEY));
    return v > 0 ? v : null;
  } catch {
    return null;
  }
}

function set(next: number | null) {
  endAt = next;
  try {
    if (next) localStorage.setItem(KEY, String(next));
    else localStorage.removeItem(KEY);
  } catch {
    // ajastin toimii silti tämän istunnon ajan
  }
  listeners.forEach((l) => l());
}

export function startRest(seconds = REST_SECONDS) {
  unlockAudio();
  set(Date.now() + seconds * 1000);
}

export function addRest(seconds: number) {
  if (endAt) set(Math.max(endAt, Date.now()) + seconds * 1000);
}

export function stopRest() {
  set(null);
}

export function useRestEnd(): number | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => endAt,
  );
}

// iOS sallii äänen vain, jos AudioContext on avattu käyttäjän toiminnon (napautus, kirjoitus) aikana.
let audio: AudioContext | null = null;

function unlockAudio() {
  try {
    audio ??= new AudioContext();
    if (audio.state === 'suspended') void audio.resume();
  } catch {
    audio = null;
  }
}

/** Kolme lyhyttä piippausta. Ei kuulu, jos puhelin on äänettömällä tai appi taustalla. */
export function beep() {
  navigator.vibrate?.([200, 100, 200]);
  if (!audio) return;
  const t0 = audio.currentTime;
  for (let i = 0; i < 3; i++) {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.frequency.value = 880;
    const t = t0 + i * 0.25;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.4, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    osc.connect(gain).connect(audio.destination);
    osc.start(t);
    osc.stop(t + 0.2);
  }
}
