import { useMemo, useState } from 'react';
import { useStore } from '../store';
import { uid } from '../utils';

interface Props {
  onClose: () => void;
}

interface EditTemplate {
  /** null = uusi pohja */
  id: string | null;
  key: string;
  name: string;
  exercises: { key: string; name: string }[];
}

/** Treeniohjelman pohjien muokkaus. Pohjat tehdään vuorotellen listan järjestyksessä. */
export function ProgramEditor({ onClose }: Props) {
  const { data, saveTemplates } = useStore();
  const nameOf = (id: string) => data.exercises.find((e) => e.id === id)?.name ?? '';

  const [templates, setTemplates] = useState<EditTemplate[]>(() =>
    data.templates.map((t) => ({
      id: t.id,
      key: t.id,
      name: t.name,
      exercises: t.exerciseIds.map((id) => ({ key: uid(), name: nameOf(id) })),
    })),
  );
  const [dirty, setDirty] = useState(false);

  const exerciseNames = useMemo(
    () => [...data.exercises].map((e) => e.name).sort((a, b) => a.localeCompare(b, 'fi')),
    [data.exercises],
  );

  const update = (key: string, fn: (t: EditTemplate) => EditTemplate) => {
    setTemplates((ts) => ts.map((t) => (t.key === key ? fn(t) : t)));
    setDirty(true);
  };

  const move = <T,>(list: T[], from: number, to: number): T[] => {
    if (to < 0 || to >= list.length) return list;
    const next = [...list];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    return next;
  };

  const handleSave = () => {
    const cleaned = templates.map((t) => ({ ...t, exercises: t.exercises.filter((e) => e.name.trim()) }));
    if (cleaned.some((t) => !t.name.trim())) {
      alert('Anna jokaiselle pohjalle nimi.');
      return;
    }
    if (cleaned.some((t) => t.exercises.length === 0)) {
      alert('Jokaisessa pohjassa pitää olla vähintään yksi liike.');
      return;
    }
    saveTemplates(cleaned.map((t) => ({ id: t.id, name: t.name, exerciseNames: t.exercises.map((e) => e.name) })));
    onClose();
  };

  const handleCancel = () => {
    if (dirty && !confirm('Hylätäänkö muutokset?')) return;
    onClose();
  };

  return (
    <div className="editor">
      <div className="view-header">
        <h1>Treeniohjelma</h1>
        <div className="row-gap">
          <button type="button" className="btn ghost" onClick={handleCancel}>
            Peruuta
          </button>
          <button type="button" className="btn primary" onClick={handleSave}>
            Tallenna
          </button>
        </div>
      </div>

      <p className="hint">
        Pohjat tehdään vuorotellen tässä järjestyksessä. Liikkeen nimen muutos koskee vain pohjaa; vanhat treenit
        säilyvät ennallaan. Jos haluat nimetä liikkeen uudelleen myös historiassa, tee se Kehitys-välilehdellä.
      </p>

      <datalist id="program-exercise-names">
        {exerciseNames.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>

      {templates.map((t, ti) => (
        <section key={t.key} className="card">
          <div className="exercise-head">
            <input
              className="exercise-name"
              type="text"
              aria-label="Pohjan nimi"
              placeholder="esim. Yläpäivä"
              value={t.name}
              onChange={(e) => update(t.key, (x) => ({ ...x, name: e.target.value }))}
            />
            <button
              type="button"
              className="icon-btn"
              aria-label="Siirrä pohja ylemmäs"
              disabled={ti === 0}
              onClick={() => {
                setTemplates((ts) => move(ts, ti, ti - 1));
                setDirty(true);
              }}
            >
              ↑
            </button>
            <button
              type="button"
              className="icon-btn"
              aria-label="Siirrä pohja alemmas"
              disabled={ti === templates.length - 1}
              onClick={() => {
                setTemplates((ts) => move(ts, ti, ti + 1));
                setDirty(true);
              }}
            >
              ↓
            </button>
          </div>

          <ol className="program-list">
            {t.exercises.map((ex, i) => (
              <li key={ex.key} className="program-row">
                <span className="set-num">{i + 1}</span>
                <input
                  type="text"
                  list="program-exercise-names"
                  aria-label={`Liike ${i + 1}`}
                  placeholder="Liikkeen nimi"
                  value={ex.name}
                  onChange={(e) =>
                    update(t.key, (x) => ({
                      ...x,
                      exercises: x.exercises.map((y) => (y.key === ex.key ? { ...y, name: e.target.value } : y)),
                    }))
                  }
                />
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={`Siirrä ${ex.name || 'liike'} ylemmäs`}
                  disabled={i === 0}
                  onClick={() => update(t.key, (x) => ({ ...x, exercises: move(x.exercises, i, i - 1) }))}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={`Poista ${ex.name || 'liike'}`}
                  onClick={() => update(t.key, (x) => ({ ...x, exercises: x.exercises.filter((y) => y.key !== ex.key) }))}
                >
                  ✕
                </button>
              </li>
            ))}
          </ol>

          <div className="row-gap wrap">
            <button
              type="button"
              className="btn subtle small"
              onClick={() => update(t.key, (x) => ({ ...x, exercises: [...x.exercises, { key: uid(), name: '' }] }))}
            >
              + Liike
            </button>
            <span className="spacer" />
            <button
              type="button"
              className="btn danger small"
              disabled={templates.length === 1}
              onClick={() => {
                if (!confirm(`Poistetaanko pohja “${t.name}”? Sillä tehdyt treenit säilyvät.`)) return;
                setTemplates((ts) => ts.filter((x) => x.key !== t.key));
                setDirty(true);
              }}
            >
              Poista pohja
            </button>
          </div>
        </section>
      ))}

      <button
        type="button"
        className="btn subtle wide"
        onClick={() => {
          setTemplates((ts) => [...ts, { id: null, key: uid(), name: '', exercises: [{ key: uid(), name: '' }] }]);
          setDirty(true);
        }}
      >
        + Uusi pohja
      </button>
    </div>
  );
}
