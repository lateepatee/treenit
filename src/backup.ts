import type { AppData } from './types';
import { dayNumber, todayISO } from './utils';

const LAST_BACKUP_KEY = 'jumppasovellus.lastBackup';

export function lastBackupDate(): string | null {
  try {
    return localStorage.getItem(LAST_BACKUP_KEY);
  } catch {
    return null;
  }
}

/**
 * Tallentaa varmuuskopion. iPhonessa avataan jakovalikko, josta tiedoston voi tallentaa
 * Tiedostot-appiin tai iCloud Driveen; muualla tiedosto ladataan suoraan.
 * Palauttaa false, jos käyttäjä perui jakamisen.
 */
export async function exportBackup(data: AppData): Promise<boolean> {
  const name = `treenit-${todayISO()}.json`;
  const json = JSON.stringify(data, null, 2);
  const file = new File([json], name, { type: 'application/json' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Treenipäiväkirjan varmuuskopio' });
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return false;
      throw e;
    }
  } else {
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }
  try {
    localStorage.setItem(LAST_BACKUP_KEY, todayISO());
  } catch {
    // muistutus vain näkyy turhaan
  }
  return true;
}

/** Muistutus, kun varmuuskopio on yli kuukauden vanha tai sitä ei ole otettu kahteen viikkoon. */
export function backupReminder(data: AppData): string | null {
  if (data.workouts.length === 0) return null;
  const today = dayNumber(todayISO());
  const last = lastBackupDate();
  if (last) {
    const days = today - dayNumber(last);
    return days >= 30 ? `Edellinen varmuuskopio on ${days} päivän takaa.` : null;
  }
  const first = data.workouts.reduce((min, w) => (w.date < min ? w.date : min), data.workouts[0].date);
  return today - dayNumber(first) >= 14 ? 'Et ole vielä ottanut varmuuskopiota.' : null;
}
