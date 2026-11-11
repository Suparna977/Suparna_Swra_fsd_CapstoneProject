import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errorMessage } from '../api.js';
import { useLoad } from '../hooks.js';
import { LEVELS } from '../constants.js';
import { ErrorNote, Spinner } from '../components/ui.jsx';

export default function Skills() {
  // Two requests at once: the full skill list, and this student's saved levels.
  const { data, error: loadError, loading } = useLoad(() => Promise.all([api.get('/skills'), api.get('/profile')]).then(([s, p]) => ({ data: { catalogue: s.data.skills, profile: p.data.skills } })), []);
  const [levels, setLevels] = useState(null); // skillId -> level (0 = none)
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');

  // When the data first arrives, build the levels map once.
  if (data && levels === null) setLevels(Object.fromEntries(data.profile.map((s) => [s.skillId, s.level])));

  const grouped = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    const list = data.catalogue.filter((s) => s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q));
    const byCategory = {};
    list.forEach((s) => (byCategory[s.category] = [...(byCategory[s.category] || []), s]));
    return Object.entries(byCategory);
  }, [data, query]);

  async function setLevel(skillId, level) {
    const before = levels[skillId] || 0;
    if (before === level) return;
    setError('');
    setLevels({ ...levels, [skillId]: level }); // update the screen immediately
    try {
      if (level === 0) await api.delete(`/profile/skills/${skillId}`);
      else await api.post('/profile/skills', { skillId, level }); // saved in MongoDB
    } catch (err) {
      setLevels((l) => ({ ...l, [skillId]: before })); // undo if the server said no
      setError(errorMessage(err));
    }
  }

  if (loading || levels === null) return loadError ? <ErrorNote>{loadError}</ErrorNote> : <Spinner label="Loading skills" />;

  const count = Object.values(levels).filter((l) => l > 0).length;

  return (
    <>
      <div className="page-head">
        <h1>My skills</h1>
        <p>Choose your level for each skill you know. Changes save as you click. Skills you skip count as None.</p>
      </div>

      <div className="toolbar">
        <label className="field field-inline">
          <span className="sr-only">Search skills</span>
          <input type="search" placeholder="Search skills, e.g. React or Data" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        <p className="toolbar-count" aria-live="polite">{count} of {data.catalogue.length} skills added</p>
        {count > 0 && <Link className="btn btn-primary" to="/roles">Pick a goal role</Link>}
      </div>

      <ErrorNote>{error}</ErrorNote>

      {grouped.length === 0 && <p className="muted">No skills match "{query}".</p>}

      {grouped.map(([category, skills]) => (
        <section key={category} className="skill-group" aria-labelledby={`cat-${category}`}>
          <h2 id={`cat-${category}`}>{category}</h2>
          <ul className="skill-list">
            {skills.map((s) => (
              <li key={s.id} className="skill-row">
                <span className="skill-name">{s.name}</span>
                <div className="segmented" role="group" aria-label={`${s.name} level`}>
                  {LEVELS.map((l) => (
                    <button
                      key={l.value}
                      type="button"
                      className={`seg${(levels[s.id] || 0) === l.value ? ' seg-on' : ''}`}
                      aria-pressed={(levels[s.id] || 0) === l.value}
                      onClick={() => setLevel(s.id, l.value)}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}
