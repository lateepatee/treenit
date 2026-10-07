import { useState, type ChangeEvent } from 'react';
import { exportBackup, lastBackupDate } from '../backup';
import { clearDraft } from '../draft';
import { emptyData, isStoredData, useStore } from '../store';
import { fmtDate } from '../utils';

export function DataView() {
  const { data, replaceData } = useStore();
  const isEmpty = data.workouts.length === 0 && data.bodyWeights.length === 0;

  const [lastBackup, setLastBackup] = useState(lastBackupDate);

  const handleExport = async () => {
    try {
      if (await exportBackup(data)) setLastBackup(lastBackupDate());
    } catch {
      alert('Varmuuskopion tallennus epäonnistui.');
    }
  };

  const handleImport = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (!isStoredData(parsed)) throw new Error('väärä muoto');
      if (!isEmpty && !confirm('Tuonti korvaa kaikki nykyiset tiedot. Jatketaanko?')) return;
      replaceData(parsed);
      alert(`Tuotu ${parsed.workouts.length} treeniä ja ${parsed.bodyWeights.length} punnitusta.`);
    } catch {
      alert('Tiedostoa ei voitu lukea. Varmista, että se on tämän sovelluksen varmuuskopio (.json).');
    }
  };

  const handleClear = () => {
    if (!confirm('Poistetaanko KAIKKI treenit ja punnitukset pysyvästi? Ota ensin varmuuskopio.')) return;
    clearDraft();
    // Treeniohjelma säilyy, vain kirjaukset poistetaan.
    const kept = new Set(data.templates.flatMap((t) => t.exerciseIds));
    replaceData({ ...emptyData(), exercises: data.exercises.filter((e) => kept.has(e.id)), templates: data.templates });
  };

  return (
    <div>
      <div className="view-header">
        <h1>Tiedot</h1>
      </div>

      <section className="card">
        <h2>Tallennus</h2>
        <p>
          Tiedot tallennetaan vain tämän selaimen muistiin tällä laitteella. Ota säännöllisesti varmuuskopio, jos
          selaimen tiedot tyhjennetään tai vaihdat laitetta.
        </p>
        <p className="muted">
          Nyt tallessa: {data.workouts.length} treeniä, {data.exercises.length} liikettä, {data.bodyWeights.length}{' '}
          punnitusta. Viimeisin varmuuskopio: {lastBackup ? fmtDate(lastBackup) : 'ei vielä otettu'}.
        </p>
        <p className="hint">
          iPhonessa varmuuskopio avautuu jakovalikkoon: valitse “Tallenna Tiedostoihin” ja esim. iCloud Drive.
        </p>
        <div className="row-gap wrap">
          <button type="button" className="btn primary" onClick={handleExport}>
            Lataa varmuuskopio
          </button>
          <label className="btn ghost file-btn">
            Palauta varmuuskopiosta
            <input type="file" accept="application/json,.json" onChange={handleImport} />
          </label>
        </div>
      </section>

      <section className="card">
        <h2>Tyhjennä</h2>
        <button type="button" className="btn danger" onClick={handleClear} disabled={isEmpty}>
          Poista kaikki tiedot
        </button>
      </section>
    </div>
  );
}
